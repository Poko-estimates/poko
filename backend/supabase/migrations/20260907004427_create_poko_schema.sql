-- Poko: games, seats, blind votes, and the round state machine.
--
-- Two invariants this file exists to defend, both enforced by the database
-- rather than by the UI:
--
--   1. BLIND VOTING. Until a round stops being the open one, a vote's value is
--      readable only by the person who cast it. "Who has voted" travels
--      separately, on the seat row, so the table can show progress without
--      leaking cards.
--   2. NO CLIENT CAN MOVE THE ROUND. status, round, estimate, slug, closed_*
--      and round_ends_at appear in no GRANT, so there is no SQL a client can
--      send that writes them. The only writers are security-definer routines
--      that check authority first.
--
-- Order matters: the deck-validation function is referenced by a CHECK on
-- games, so it must exist first; policies must follow the helpers they call.


-- ---------------------------------------------------------------------------
-- 0. Private schema for RLS and trigger helpers.
--
-- Not listed in config.toml api.schemas, so PostgREST cannot reach anything in
-- here, and `authenticated` gets no USAGE. Both matter: these functions are
-- security definer and would otherwise be public API.
-- ---------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public;


-- ---------------------------------------------------------------------------
-- 1. Deck validation.
--
-- Called from a CHECK constraint, so it must be immutable. Mirrors
-- minDeckValues/maxDeckValues in frontend/lib/decks.ts and the dedupe that
-- parseDeckValues() already does client-side; an action is a public endpoint,
-- so the rule has to live here too.
-- ---------------------------------------------------------------------------
create or replace function public.poko_deck_values_ok(vals text[])
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  select vals is not null
     and cardinality(vals) between 2 and 16
     and not exists (
           select 1 from unnest(vals) v where v is null or btrim(v) = ''
         )
     and cardinality(vals) = (select count(distinct v) from unnest(vals) v);
$$;


-- ---------------------------------------------------------------------------
-- 2. Slug generation.
--
-- The slug IS the invitation: possession grants entry, so it must be
-- unguessable and the client must not choose it. A readable prefix keeps the
-- URL friendly; 12 hex chars (~48 bits) keep it from being enumerable.
--
-- This has to be a trigger. A column DEFAULT cannot reference another column,
-- and a GENERATED column cannot be volatile.
-- ---------------------------------------------------------------------------
create or replace function private.poko_slug(p_name text)
returns text
language sql
volatile
set search_path = ''
as $$
  select left(
           coalesce(
             nullif(btrim(regexp_replace(lower(p_name), '[^a-z0-9]+', '-', 'g'), '-'), ''),
             'room'
           ),
           40
         )
      || '-'
      || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
$$;


-- ---------------------------------------------------------------------------
-- 3. games — the room, the deck, and the round state machine.
--
-- The deck is stored inline rather than in its own table: it is a value object
-- captured at creation, not a shared entity. Presets already live as frontend
-- constants, so there is nothing to look up, and inlining buys the same-row
-- CHECK that an estimate is always a card from THIS game's deck — which a
-- separate table could not express.
-- ---------------------------------------------------------------------------
create table public.games (
  id                     uuid primary key default gen_random_uuid(),
  owner_id               uuid not null default auth.uid()
                           references auth.users (id) on delete cascade,
  name                   text not null,
  slug                   text not null unique,

  deck_name              text not null,
  deck_values            text[] not null,

  -- Only ever increments. Reopening starts a new pass, which is what lets one
  -- write clear every seat and keeps previous rounds' cards readable.
  round                  integer not null default 1,
  status                 text    not null default 'voting',
  estimate               text,
  closed_at              timestamptz,
  closed_reason          text,

  -- round_ends_at is the deadline authority. round_duration_seconds is the
  -- carried setting, applied when the next round opens — so editing it cannot
  -- move a deadline that is already running.
  round_duration_seconds integer,
  round_started_at       timestamptz not null default now(),
  round_ends_at          timestamptz,

  auto_close             boolean not null default true,
  -- Off by default: if any participant may reveal, "blind" is a social
  -- convention rather than a guarantee. The timebox is the escape hatch for a
  -- vanished owner, since it hands closing authority to everyone at the deadline.
  allow_participant_reveal boolean not null default false,

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  constraint games_name_not_blank      check (btrim(name) <> ''),
  constraint games_deck_name_not_blank check (btrim(deck_name) <> ''),
  constraint games_deck_values_valid   check (public.poko_deck_values_ok(deck_values)),
  constraint games_status_valid        check (status in ('voting', 'closed')),
  constraint games_round_positive      check (round >= 1),
  constraint games_estimate_in_deck    check (estimate is null
                                              or estimate = any (deck_values)),
  constraint games_duration_range      check (round_duration_seconds is null
                                              or round_duration_seconds between 10 and 3600),
  constraint games_closed_reason_valid check (closed_reason is null
                                              or closed_reason in ('all_voted', 'manual', 'timeout')),
  constraint games_closed_state check (
       (status = 'closed' and closed_at is not null and closed_reason is not null)
    or (status = 'voting' and closed_at is null     and closed_reason is null)
  ),
  constraint games_ends_at_requires_duration check (
       (round_duration_seconds is null     and round_ends_at is null)
    or (round_duration_seconds is not null and round_ends_at is not null)
  )
);

-- "My games, newest first" — the dashboard's only list query.
create index games_owner_id_created_at_idx
  on public.games (owner_id, created_at desc);

-- Partial index for the (later, optional) pg_cron expiry sweep: only rows it
-- could ever act on.
create index games_open_deadline_idx
  on public.games (round_ends_at)
  where status = 'voting' and round_ends_at is not null;


-- ---------------------------------------------------------------------------
-- 4. game_participants — a seat at one game's table.
-- ---------------------------------------------------------------------------
create table public.game_participants (
  game_id      uuid not null references public.games (id) on delete cascade,
  user_id      uuid not null default auth.uid()
                 references auth.users (id) on delete cascade,
  -- Kept here, not in user_metadata: you cannot read another user's metadata,
  -- and the roster has to render everyone's name. It is also legitimately
  -- per-game — you may be "Tracy" in one room and "Tracy (PM)" in another.
  display_name text not null,

  -- WHICH round this seat has a card down for. Never the value.
  -- "has voted" == voted_round = games.round.
  voted_round  integer,
  voted_at     timestamptz,
  joined_at    timestamptz not null default now(),

  primary key (game_id, user_id),

  constraint gp_display_name_not_blank check (btrim(display_name) <> ''),
  constraint gp_display_name_len       check (length(display_name) <= 60)
);

-- The PK covers (game_id, ...) lookups. user_id needs its own index for the
-- auth.users cascade and for "games I joined".
create index game_participants_user_id_idx on public.game_participants (user_id);


-- ---------------------------------------------------------------------------
-- 5. votes — the only secret in the schema.
-- ---------------------------------------------------------------------------
create table public.votes (
  game_id    uuid    not null,
  round      integer not null,
  user_id    uuid    not null default auth.uid(),
  value      text    not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- "One card each, per round", structurally rather than by convention.
  primary key (game_id, round, user_id),

  -- To the seat, not to auth.users: only a participant can hold a card, and
  -- leaving the table takes your card with you.
  constraint votes_participant_fkey
    foreign key (game_id, user_id)
    references public.game_participants (game_id, user_id) on delete cascade,

  constraint votes_round_positive  check (round >= 1),
  constraint votes_value_not_blank check (btrim(value) <> '')
);

-- (game_id, user_id) is not a PK prefix — round sits between them — so the FK
-- needs its own index for joins and cascades.
create index votes_game_id_user_id_idx on public.votes (game_id, user_id);

comment on table public.votes is
  'BLIND-VOTE BOUNDARY. Never add this table to the supabase_realtime '
  'publication: Postgres Changes filters by ROW, not by column, so any '
  'participant authorised to know THAT you voted would also receive your '
  'VALUE. Every live update is a hand-built Broadcast payload from a trigger.';


-- ---------------------------------------------------------------------------
-- 6. RLS helpers.
--
-- All three are security definer for one reason: policy recursion. A
-- game_participants SELECT policy that means "I see everyone at any table I am
-- sitting at" has to query game_participants, and inlined that raises
-- 42P17 infinite recursion detected in policy — for every role, so nothing
-- works at all. Reading the table as the function owner breaks the cycle.
--
-- Each contains its own auth.uid() check, so none can be used as an oracle
-- about someone else's data. search_path is pinned and every name qualified:
-- `authenticated` can create objects in public on a default project, so an
-- unqualified name inside a definer function is a privilege-escalation hole.
-- ---------------------------------------------------------------------------
create or replace function private.is_game_participant(p_game_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.game_participants gp
     where gp.game_id = p_game_id
       and gp.user_id = (select auth.uid())
  );
$$;

create or replace function private.is_game_owner(p_game_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.games g
     where g.id = p_game_id
       and g.owner_id = (select auth.uid())
  );
$$;

-- The reveal predicate, defined once so the RLS policy and the broadcast
-- cannot disagree about what "revealed" means.
--
-- Note it is `round < games.round OR (round = games.round AND closed)`, not
-- merely `closed`: written as just `closed`, every previous pass's cards would
-- vanish the moment the round was reopened.
create or replace function private.round_is_revealed(p_game_id uuid, p_round integer)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.games g
     where g.id = p_game_id
       and (p_round < g.round
            or (p_round = g.round and g.status = 'closed'))
  );
$$;

-- These three are called from RLS policy expressions, which Postgres evaluates
-- with the privileges of the role running the query. So `authenticated` needs
-- USAGE on the schema and EXECUTE on each function, or every policy fails with
-- "permission denied". Revoking them (as the generic advice suggests) would
-- break the whole schema.
--
-- What keeps them safe instead:
--   * `private` is absent from config.toml api.schemas, so PostgREST cannot
--     expose them as RPC endpoints — they are unreachable over the Data API.
--   * each body hard-codes (select auth.uid()), so calling one directly tells
--     you only about your own membership. There is no argument that makes one
--     answer a question about somebody else.
revoke all on function private.is_game_participant(uuid)        from public;
revoke all on function private.is_game_owner(uuid)              from public;
revoke all on function private.round_is_revealed(uuid, integer)  from public;

grant usage on schema private to authenticated;
grant execute on function private.is_game_participant(uuid)       to authenticated;
grant execute on function private.is_game_owner(uuid)             to authenticated;
grant execute on function private.round_is_revealed(uuid, integer) to authenticated;


-- ---------------------------------------------------------------------------
-- 7. Row level security.
-- ---------------------------------------------------------------------------
alter table public.games             enable row level security;
alter table public.game_participants enable row level security;
alter table public.votes             enable row level security;

-- games ---------------------------------------------------------------------

create policy games_select_participants on public.games
for select to authenticated
using (
  owner_id = (select auth.uid())
  or (select private.is_game_participant(id))
);

create policy games_insert_own on public.games
for insert to authenticated
with check ( owner_id = (select auth.uid()) );

-- Anonymous guests join and vote; they never own. RESTRICTIVE so it ANDs with
-- the policy above — a permissive policy would be OR-ed away and do nothing.
-- This is also what guarantees owner_id is always a durable identity, which is
-- what makes the anonymous-user cleanup cascade safe.
--
-- `is distinct from 'true'` rather than a boolean cast: a missing or malformed
-- claim degrades to "permanent" instead of raising 22P02 inside a policy.
-- The select wraps the FUNCTION CALL, not the whole expression, so auth.jwt()
-- is hoisted into an InitPlan and evaluated once rather than per row.
create policy games_insert_not_anonymous on public.games
as restrictive for insert to authenticated
with check ( ((select auth.jwt()) ->> 'is_anonymous') is distinct from 'true' );

-- Both USING and WITH CHECK: without the check, owner_id could be reassigned
-- to someone else.
create policy games_update_owner on public.games
for update to authenticated
using      ( owner_id = (select auth.uid()) )
with check ( owner_id = (select auth.uid()) );

create policy games_delete_owner on public.games
for delete to authenticated
using ( owner_id = (select auth.uid()) );

-- game_participants ---------------------------------------------------------

-- Everyone at the table sees the roster, including who has a card down
-- (voted_round) but never what it is. This is where "X has voted" comes from.
create policy gp_select_table on public.game_participants
for select to authenticated
using ( (select private.is_game_participant(game_id)) );

-- No INSERT policy, by design. The only way in is public.join_game(slug),
-- which proves possession of the invite token. Withholding the INSERT grant
-- (section 8) enforces the same thing a second time.

create policy gp_update_self on public.game_participants
for update to authenticated
using      ( user_id = (select auth.uid()) )
with check ( user_id = (select auth.uid()) );

create policy gp_delete_self_or_owner on public.game_participants
for delete to authenticated
using (
  user_id = (select auth.uid())
  or (select private.is_game_owner(game_id))
);

-- votes ---------------------------------------------------------------------

-- THE BLIND-VOTE BOUNDARY. Read your own card always; read anyone else's only
-- once the round is no longer the open one.
--
-- The `user_id = auth.uid()` branch is load-bearing beyond reads: an UPDATE
-- must first SELECT the row, so without it every attempt to change your own
-- card would silently affect 0 rows with no error at all.
create policy votes_select_own_or_revealed on public.votes
for select to authenticated
using (
  (select private.is_game_participant(game_id))
  and (
    user_id = (select auth.uid())
    or (select private.round_is_revealed(game_id, round))
  )
);

-- Write policies check ownership only. Whether the move is *legal right now*
-- (round open, deadline unexpired, value in deck, round not stale) is the
-- trigger's job in section 9: an RLS failure surfaces as an opaque 42501,
-- whereas "the round just closed" is an expected, user-facing condition that
-- deserves a branchable error.
create policy votes_insert_own on public.votes
for insert to authenticated
with check ( user_id = (select auth.uid()) );

create policy votes_update_own on public.votes
for update to authenticated
using      ( user_id = (select auth.uid()) )
with check ( user_id = (select auth.uid()) );

create policy votes_delete_own on public.votes
for delete to authenticated
using ( user_id = (select auth.uid()) );


-- ---------------------------------------------------------------------------
-- 8. Grants — least privilege, per column.
--
-- This layer does as much security work as the policies, and it runs first.
-- Note what is absent: slug, round, status, estimate, closed_at, closed_reason,
-- round_started_at and round_ends_at are in NO grant. That — not a policy
-- predicate — is what stops a participant flipping the round early. There is
-- no statement a client can send that writes them.
--
-- Likewise owner_id and user_id have `default auth.uid()` and appear in no
-- insert grant, so a client physically cannot name another user, before RLS is
-- even consulted.
--
-- Since 2026-04-28 new public tables are not auto-exposed to the Data API, so
-- these grants are required, not belt-and-braces.
-- ---------------------------------------------------------------------------
grant usage on schema public to authenticated;

-- REVOKE FIRST. This is not defensive tidying — it is load-bearing.
--
-- Supabase ships `alter default privileges ... grant all on tables to anon,
-- authenticated, service_role`, so the moment these tables were created,
-- `authenticated` already held table-wide INSERT/UPDATE/DELETE on every
-- column — status, round, estimate, slug and owner_id included. Column-level
-- grants only ever ADD privileges, so without these revokes the per-column
-- lists below are no-ops and the "no client can write status" guarantee
-- silently does not exist. A pgTAP assertion covers this exact regression.
revoke all on public.games             from anon, authenticated;
revoke all on public.game_participants from anon, authenticated;
revoke all on public.votes             from anon, authenticated;

grant select on public.games to authenticated;
grant insert (name, deck_name, deck_values, round_duration_seconds,
              auto_close, allow_participant_reveal)
  on public.games to authenticated;
grant update (name, deck_name, deck_values, round_duration_seconds,
              auto_close, allow_participant_reveal)
  on public.games to authenticated;
grant delete on public.games to authenticated;

-- Rename your own seat and leave. voted_round is not grantable, so nobody can
-- fake or clear "has voted"; the trigger that writes it is security definer.
grant select                on public.game_participants to authenticated;
grant update (display_name) on public.game_participants to authenticated;
grant delete                on public.game_participants to authenticated;

grant select                         on public.votes to authenticated;
grant insert (game_id, round, value) on public.votes to authenticated;
grant update (value)                 on public.votes to authenticated;
grant delete                         on public.votes to authenticated;

-- anon keeps nothing from the revokes above: /room/<slug> signs in
-- (anonymously) before it reads anything.


-- ---------------------------------------------------------------------------
-- 9. Round state machine.
-- ---------------------------------------------------------------------------

-- Broadcast must never be able to roll back a vote. A Realtime hiccup is a
-- missed animation; clients reconcile with a refetch on (re)subscribe.
create or replace function private.poko_broadcast(p_game_id uuid,
                                                  p_event text,
                                                  p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- `true` = private, matching `private: true` on the client. A public
  -- broadcast never reaches a private channel.
  perform realtime.send(p_payload, p_event, 'game:' || p_game_id::text, true);
exception when others then
  raise warning 'poko: realtime.send(%) failed: %', p_event, sqlerrm;
end;
$$;

-- Seed a participant's display name from their own metadata. Only ever called
-- for the calling user, and display-only — user_metadata is user-editable and
-- must never inform an authorization decision.
create or replace function private.poko_display_name_for(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
           nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
           nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
           'Guest'
         )
    from auth.users u
   where u.id = p_user_id;
$$;

-- THE single place a round is allowed to close, so the estimate rule and the
-- flip payload cannot drift between the automatic and manual paths.
--
-- `where status = 'voting' ... for update` makes it idempotent under
-- concurrency: if another transaction closed and committed, FOR UPDATE
-- re-reads the latest row version, re-checks the predicate, finds nothing and
-- returns. That is what lets N racing countdown timers all call close_round
-- harmlessly.
create or replace function private.close_round_locked(p_game_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_round    integer;
  v_estimate text;
  v_votes    jsonb;
begin
  select g.round into v_round
    from public.games g
   where g.id = p_game_id
     and g.status = 'voting'
     for update;

  if not found then
    return;  -- already closed: a no-op, not an error
  end if;

  -- Unanimous or nothing. deck_values is text[] and every preset carries '?'
  -- and a coffee cup, so there is no arithmetic to do; a modal value would
  -- record a number nobody agreed to, and an estimate the team did not agree
  -- is not an estimate. set_estimate() is the path for what discussion lands on.
  select case when count(*) > 0 and count(distinct v.value) = 1
              then min(v.value)
         end,
         coalesce(
           jsonb_agg(jsonb_build_object('user_id', v.user_id, 'value', v.value)
                     order by v.user_id),
           '[]'::jsonb
         )
    into v_estimate, v_votes
    from public.votes v
   where v.game_id = p_game_id
     and v.round   = v_round;

  update public.games
     set status        = 'closed',
         estimate      = v_estimate,
         closed_at     = now(),
         closed_reason = p_reason,
         updated_at    = now()
   where id = p_game_id;

  -- THE FLIP: one message, every participant, the same instant. Values appear
  -- here and nowhere earlier, because a broadcast payload is identical for
  -- every subscriber and is NOT filtered by RLS. This is also the only moment
  -- round_is_revealed() starts returning true, so the socket and a REST read
  -- agree.
  perform private.poko_broadcast(p_game_id, 'round_closed', jsonb_build_object(
    'round',         v_round,
    'estimate',      v_estimate,
    'closed_reason', p_reason,
    'votes',         v_votes,
    'server_now',    now()
  ));
end;
$$;

-- Only ever closes, never reopens: auto-reopening on a late join would be a
-- griefing vector and would destroy "the flip is final".
create or replace function private.poko_maybe_auto_close(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_game  public.games;
  v_seats integer;
  v_voted integer;
begin
  select * into v_game from public.games where id = p_game_id for update;

  if not found or v_game.status <> 'voting' or not v_game.auto_close then
    return;
  end if;

  -- The denominator comes from the seat table, never from Presence: a flaky
  -- network would otherwise close rounds early.
  select count(*),
         count(*) filter (where gp.voted_round = v_game.round)
    into v_seats, v_voted
    from public.game_participants gp
   where gp.game_id = p_game_id;

  -- With one person at the table there is nothing to be blind about, and the
  -- owner would never get to sit on a card while waiting for the team.
  if v_seats >= 2 and v_voted = v_seats then
    perform private.close_round_locked(p_game_id, 'all_voted');
  end if;
end;
$$;

-- Enforces what RLS deliberately does not: whether this move is legal now.
-- Each failure raises a distinct hint, which PostgREST surfaces, so the client
-- branches on error.hint instead of parsing prose.
create or replace function private.poko_votes_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_game public.games;
  v_row  public.votes := coalesce(new, old);
begin
  -- THE serialization point for everything in this game. Without it, two
  -- concurrent voters each count "have all voted?" under READ COMMITTED,
  -- neither sees the other's uncommitted row, and nobody closes the round.
  select * into v_game from public.games where id = v_row.game_id for update;

  if not found then
    raise exception 'poko: game % not found', v_row.game_id
      using errcode = 'no_data_found', hint = 'poko_game_missing';
  end if;

  -- A cascade delete (seat removed, or game deleted) must pass: the parent row
  -- is already gone by the time the referential action fires. Without this,
  -- leaving the table after a reveal would raise poko_round_closed below.
  if tg_op = 'DELETE' and not exists (
       select 1 from public.game_participants gp
        where gp.game_id = old.game_id
          and gp.user_id = old.user_id
     ) then
    return old;
  end if;

  if v_game.status <> 'voting' then
    raise exception 'poko: round % is closed', v_game.round
      using errcode = 'P0001', hint = 'poko_round_closed';
  end if;

  -- The deadline is enforced HERE, in the database. This is what makes the
  -- timebox real with no scheduler running at all: a purely client-side
  -- countdown would show 00:00 while votes kept landing.
  if v_game.round_ends_at is not null and now() >= v_game.round_ends_at then
    raise exception 'poko: round % has expired', v_game.round
      using errcode = 'P0001', hint = 'poko_round_expired';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  -- Optimistic concurrency for free: a client whose round was reopened while
  -- it was choosing gets a clean error instead of voting into the wrong round.
  if new.round <> v_game.round then
    raise exception 'poko: vote is for round %, game is on round %',
                    new.round, v_game.round
      using errcode = 'P0001', hint = 'poko_stale_round';
  end if;

  if new.value <> all (v_game.deck_values) then
    raise exception 'poko: % is not a card in this deck', new.value
      using errcode = 'P0001', hint = 'poko_value_not_in_deck';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger votes_guard
before insert or update or delete on public.votes
for each row execute function private.poko_votes_guard();

create or replace function private.poko_votes_after()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row   public.votes := coalesce(new, old);
  v_round integer;
begin
  select g.round into v_round from public.games g where g.id = v_row.game_id;

  if tg_op = 'DELETE' then
    update public.game_participants
       set voted_round = null, voted_at = null
     where game_id = v_row.game_id
       and user_id = v_row.user_id;

    perform private.poko_broadcast(v_row.game_id, 'vote_cleared',
      jsonb_build_object('user_id', v_row.user_id, 'round', v_round));
  else
    update public.game_participants
       set voted_round = new.round, voted_at = now()
     where game_id = new.game_id
       and user_id = new.user_id;

    -- "X has voted" carries WHO and WHEN. It cannot carry WHAT: the value is
    -- absent here, and votes is in no Realtime publication.
    perform private.poko_broadcast(new.game_id, 'vote_cast',
      jsonb_build_object('user_id',  new.user_id,
                         'round',    new.round,
                         'voted_at', now()));
  end if;

  perform private.poko_maybe_auto_close(v_row.game_id);
  return null;
end;
$$;

create trigger votes_after
after insert or update or delete on public.votes
for each row execute function private.poko_votes_after();

-- Slug + deadline for a new game.
create or replace function private.poko_games_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt integer := 0;
begin
  if new.slug is null or btrim(new.slug) = '' then
    loop
      v_attempt := v_attempt + 1;
      new.slug := private.poko_slug(new.name);
      exit when not exists (select 1 from public.games g where g.slug = new.slug);
      if v_attempt >= 5 then
        raise exception 'poko: could not allocate a unique slug'
          using errcode = 'P0001', hint = 'poko_slug_exhausted';
      end if;
    end loop;
  end if;

  new.round_started_at := now();
  new.round_ends_at := case
    when new.round_duration_seconds is null then null
    else now() + make_interval(secs => new.round_duration_seconds)
  end;

  return new;
end;
$$;

create trigger games_before_insert
before insert on public.games
for each row execute function private.poko_games_before_insert();

-- A seat leaving can be the thing that completes a round: if three of four
-- have voted and the fourth walks out, the room must not hang forever waiting
-- for someone who left.
create or replace function private.poko_participants_after()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.poko_broadcast(new.game_id, 'participant_joined',
      jsonb_build_object('user_id', new.user_id,
                         'display_name', new.display_name));
  elsif tg_op = 'UPDATE' and new.display_name <> old.display_name then
    perform private.poko_broadcast(new.game_id, 'participant_renamed',
      jsonb_build_object('user_id', new.user_id,
                         'display_name', new.display_name));
  elsif tg_op = 'DELETE' then
    perform private.poko_broadcast(old.game_id, 'participant_left',
      jsonb_build_object('user_id', old.user_id));
  end if;

  -- The game row may already be gone (cascade from games delete).
  if tg_op <> 'UPDATE' then
    perform private.poko_maybe_auto_close(coalesce(new.game_id, old.game_id));
  end if;

  return null;
end;
$$;

create trigger participants_after
after insert or update or delete on public.game_participants
for each row execute function private.poko_participants_after();


-- ---------------------------------------------------------------------------
-- 10. Public RPCs.
--
-- Each: reject anon, lock the game row, authorise, validate state, act.
-- These are the only security-definer functions in an exposed schema, so each
-- is explicitly revoked from PUBLIC/anon and granted to authenticated only —
-- Postgres grants EXECUTE to PUBLIC by default, which would otherwise make
-- them callable without a session.
-- ---------------------------------------------------------------------------

-- Possession of the slug IS the invitation, and there is no RLS formulation of
-- "you may read the row whose slug you can name" — hence this function. It is
-- the only way into game_participants: no INSERT policy, no INSERT grant.
create or replace function public.join_game(p_slug text,
                                            p_display_name text default null)
returns public.games
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_game public.games;
  v_uid  uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'poko: sign in before joining'
      using errcode = '28000', hint = 'poko_not_signed_in';
  end if;

  -- FOR UPDATE serialises the join against in-flight votes, so a join can
  -- never land half-way through an auto-close evaluation.
  select * into v_game from public.games where slug = p_slug for update;

  if not found then
    raise exception 'poko: no such room'
      using errcode = 'no_data_found', hint = 'poko_room_missing';
  end if;

  -- Aliased so the DO UPDATE can name the existing row: a schema-qualified
  -- reference is not valid in that clause.
  insert into public.game_participants as gp (game_id, user_id, display_name)
  values (v_game.id, v_uid,
          left(coalesce(nullif(btrim(p_display_name), ''),
                        private.poko_display_name_for(v_uid)), 60))
  on conflict (game_id, user_id) do update
     set display_name = coalesce(nullif(btrim(p_display_name), ''),
                                 gp.display_name);

  return v_game;
end;
$$;

-- Owner always; any participant if the owner opted in; any participant once
-- the deadline has passed, because at that point the CLOCK is the authority —
-- and unlike a client's claim, that is a fact the database can verify.
create or replace function public.close_round(p_game_id uuid)
returns public.games
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_game    public.games;
  v_uid     uuid := (select auth.uid());
  v_expired boolean;
begin
  if v_uid is null then
    raise exception 'poko: sign in first'
      using errcode = '28000', hint = 'poko_not_signed_in';
  end if;

  select * into v_game from public.games where id = p_game_id for update;

  if not found then
    raise exception 'poko: no such game'
      using errcode = 'no_data_found', hint = 'poko_game_missing';
  end if;

  -- Must be at the table at all before authority is even considered.
  if v_game.owner_id <> v_uid
     and not exists (
       select 1 from public.game_participants gp
        where gp.game_id = p_game_id and gp.user_id = v_uid
     ) then
    raise exception 'poko: not at this table'
      using errcode = '42501', hint = 'poko_not_participant';
  end if;

  v_expired := v_game.round_ends_at is not null and now() >= v_game.round_ends_at;

  if v_game.owner_id <> v_uid
     and not v_game.allow_participant_reveal
     and not v_expired then
    raise exception 'poko: only the owner can close this round early'
      using errcode = '42501', hint = 'poko_not_owner';
  end if;

  perform private.close_round_locked(
    p_game_id,
    case when v_expired then 'timeout' else 'manual' end
  );

  select * into v_game from public.games where id = p_game_id;
  return v_game;
end;
$$;

-- Owner only: letting anyone reopen is a griefing vector that erases a reveal.
-- Incrementing round clears every seat's voted_round with one write, and keeps
-- the previous pass's cards readable.
create or replace function public.reopen_round(p_game_id uuid)
returns public.games
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_game public.games;
  v_uid  uuid := (select auth.uid());
begin
  select * into v_game from public.games where id = p_game_id for update;

  if not found or v_game.owner_id <> v_uid then
    raise exception 'poko: only the owner can reopen a round'
      using errcode = '42501', hint = 'poko_not_owner';
  end if;

  if v_game.status <> 'closed' then
    return v_game;  -- already open
  end if;

  update public.games
     set round            = round + 1,
         status           = 'voting',
         estimate         = null,
         closed_at        = null,
         closed_reason    = null,
         round_started_at = now(),
         round_ends_at    = case
                              when round_duration_seconds is null then null
                              else now() + make_interval(secs => round_duration_seconds)
                            end,
         updated_at       = now()
   where id = p_game_id
   returning * into v_game;

  perform private.poko_broadcast(p_game_id, 'round_reopened', jsonb_build_object(
    'round',         v_game.round,
    'round_ends_at', v_game.round_ends_at,
    'server_now',    now()
  ));

  return v_game;
end;
$$;

-- The path for recording the number the team talked its way to, which is why
-- close_round takes no estimate argument: nobody invents one at close time.
create or replace function public.set_estimate(p_game_id uuid, p_estimate text)
returns public.games
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_game public.games;
  v_uid  uuid := (select auth.uid());
begin
  select * into v_game from public.games where id = p_game_id for update;

  if not found or v_game.owner_id <> v_uid then
    raise exception 'poko: only the owner can record an estimate'
      using errcode = '42501', hint = 'poko_not_owner';
  end if;

  if v_game.status <> 'closed' then
    raise exception 'poko: close the round before recording an estimate'
      using errcode = 'P0001', hint = 'poko_round_open';
  end if;

  -- games_estimate_in_deck guarantees this is a card in this game's deck.
  update public.games
     set estimate = p_estimate, updated_at = now()
   where id = p_game_id
   returning * into v_game;

  perform private.poko_broadcast(p_game_id, 'game_updated',
    jsonb_build_object('estimate', p_estimate));

  return v_game;
end;
$$;

revoke all on function public.join_game(text, text)        from public, anon;
revoke all on function public.close_round(uuid)            from public, anon;
revoke all on function public.reopen_round(uuid)           from public, anon;
revoke all on function public.set_estimate(uuid, text)     from public, anon;
-- Referenced by a CHECK constraint on games, so it must stay executable by any
-- role that inserts. Pure validator, no data access.
grant execute on function public.poko_deck_values_ok(text[]) to authenticated;

grant execute on function public.join_game(text, text)    to authenticated;
grant execute on function public.close_round(uuid)        to authenticated;
grant execute on function public.reopen_round(uuid)       to authenticated;
grant execute on function public.set_estimate(uuid, text) to authenticated;


-- ---------------------------------------------------------------------------
-- 11. Realtime authorization.
--
-- Postgres Changes payloads are filtered by RLS on the source table. Broadcast
-- and Presence are NOT — they authorise here, via RLS on realtime.messages,
-- together with `private: true` on the client.
--
-- Policies only: the realtime schema has been locked down since 2026-07-14, so
-- nothing may be created inside it. RLS is already enabled on that table by
-- Supabase — do not ALTER it.
-- ---------------------------------------------------------------------------
create or replace function private.can_use_game_topic(p_topic text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_id text;
begin
  -- Never cast an untrusted string straight to uuid: a malformed topic would
  -- raise 22P02 inside a policy and fail the channel join opaquely.
  v_id := substring(p_topic from
    '^game:([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$');

  if v_id is null then
    return false;
  end if;

  return private.is_game_participant(v_id::uuid);
end;
$$;

-- Called from the realtime.messages policies below, so same reasoning as the
-- helpers in section 6: authenticated must be able to execute it.
revoke all on function private.can_use_game_topic(text) from public;
grant execute on function private.can_use_game_topic(text) to authenticated;

-- READ: participants receive broadcast and presence for their own game only.
create policy poko_read_game_channel on realtime.messages
for select to authenticated
using (
  realtime.messages.extension in ('broadcast', 'presence')
  and (select private.can_use_game_topic((select realtime.topic())))
);

-- WRITE: PRESENCE ONLY. Clients may say "I'm here"; they may not broadcast.
-- Without this narrowing, any participant could emit a forged round_closed
-- carrying invented values to the whole room and defeat blind voting at the
-- presentation layer. Every real event originates from a trigger, which
-- Realtime delivers as supabase_admin and is not subject to this policy.
create policy poko_write_game_presence on realtime.messages
for insert to authenticated
with check (
  realtime.messages.extension = 'presence'
  and (select private.can_use_game_topic((select realtime.topic())))
);
