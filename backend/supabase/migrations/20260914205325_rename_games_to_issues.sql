-- "Game" becomes "issue", and an issue list you can put in your own order.
--
-- Two changes, in one migration because the second is written in terms of the
-- first:
--
--   1. RENAME. A "game" was always the thing being estimated — one story, one
--      deck, one round. The product calls that an issue, and the schema now
--      says so: games -> issues, game_participants -> issue_participants,
--      game_id -> issue_id, join_game -> join_issue, and the realtime topic
--      prefix game: -> issue:.
--
--   2. PER-USER ORDER. issue_order records where each person keeps each issue
--      in their own sidebar. Per user, not per issue, because the list you see
--      includes issues you merely have a seat at — a single shared position
--      column would make those undraggable for you and reorderable for someone
--      else out from under you.
--
-- Why so much of this file is `drop function` / `create function` rather than
-- `alter ... rename`: a plpgsql body is stored as TEXT and resolved at call
-- time, so renaming a table leaves every function that names it broken until
-- the body is rewritten. And `create or replace function` cannot rename an
-- existing parameter, so p_game_id -> p_issue_id needs a real drop. Objects
-- are therefore dropped in dependency order — triggers, then policies, then
-- the functions both of them reference — and rebuilt in the reverse.
--
-- Nothing here re-grants anything. Table and column privileges are held
-- against the object, not its name, so the per-column grant lists from the
-- first migration survive both renames intact. That matters: those grants are
-- what stop a client writing `status`, and silently re-issuing them here would
-- be a chance to widen them by accident.


-- ---------------------------------------------------------------------------
-- 1. Tables and columns.
-- ---------------------------------------------------------------------------
alter table public.games             rename to issues;
alter table public.game_participants rename to issue_participants;

alter table public.issue_participants rename column game_id to issue_id;
alter table public.votes              rename column game_id to issue_id;


-- ---------------------------------------------------------------------------
-- 2. Everything named after the old tables.
--
-- Cosmetic on its own — but a constraint or index still called `games_*` is
-- the kind of thing that outlives everyone who remembers why, and these names
-- surface in generated TypeScript and in error messages.
-- ---------------------------------------------------------------------------
alter index games_pkey                        rename to issues_pkey;
alter index games_slug_key                    rename to issues_slug_key;
alter index games_owner_id_created_at_idx     rename to issues_owner_id_created_at_idx;
alter index games_open_deadline_idx           rename to issues_open_deadline_idx;
alter index game_participants_pkey            rename to issue_participants_pkey;
alter index game_participants_user_id_idx     rename to issue_participants_user_id_idx;
alter index votes_game_id_user_id_idx         rename to votes_issue_id_user_id_idx;

alter table public.issues
  rename constraint games_owner_id_fkey to issues_owner_id_fkey;
alter table public.issues
  rename constraint games_name_not_blank to issues_name_not_blank;
alter table public.issues
  rename constraint games_deck_name_not_blank to issues_deck_name_not_blank;
alter table public.issues
  rename constraint games_deck_values_valid to issues_deck_values_valid;
alter table public.issues
  rename constraint games_status_valid to issues_status_valid;
alter table public.issues
  rename constraint games_round_positive to issues_round_positive;
alter table public.issues
  rename constraint games_estimate_in_deck to issues_estimate_in_deck;
alter table public.issues
  rename constraint games_duration_range to issues_duration_range;
alter table public.issues
  rename constraint games_closed_reason_valid to issues_closed_reason_valid;
alter table public.issues
  rename constraint games_closed_state to issues_closed_state;
alter table public.issues
  rename constraint games_ends_at_requires_duration to issues_ends_at_requires_duration;
alter table public.issues
  rename constraint games_summary_not_blank to issues_summary_not_blank;
alter table public.issues
  rename constraint games_summary_length to issues_summary_length;

alter table public.issue_participants
  rename constraint game_participants_game_id_fkey to issue_participants_issue_id_fkey;
alter table public.issue_participants
  rename constraint game_participants_user_id_fkey to issue_participants_user_id_fkey;
alter table public.issue_participants
  rename constraint gp_display_name_not_blank to ip_display_name_not_blank;
alter table public.issue_participants
  rename constraint gp_display_name_len to ip_display_name_len;

comment on table public.votes is
  'BLIND-VOTE BOUNDARY. Never add this table to the supabase_realtime '
  'publication: Postgres Changes filters by ROW, not by column, so any '
  'participant authorised to know THAT you voted would also receive your '
  'VALUE. Every live update is a hand-built Broadcast payload from a trigger.';


-- ---------------------------------------------------------------------------
-- 3. Drop triggers, then policies, then the functions they depend on.
--
-- The realtime.messages policies go too: they call can_use_game_topic, and the
-- topic prefix itself is changing.
-- ---------------------------------------------------------------------------
drop trigger if exists votes_guard         on public.votes;
drop trigger if exists votes_after         on public.votes;
drop trigger if exists games_before_insert on public.issues;
drop trigger if exists games_after_insert  on public.issues;
drop trigger if exists games_before_update on public.issues;
drop trigger if exists participants_after  on public.issue_participants;

drop policy if exists games_select_participants  on public.issues;
drop policy if exists games_insert_own           on public.issues;
drop policy if exists games_insert_not_anonymous on public.issues;
drop policy if exists games_update_owner         on public.issues;
drop policy if exists games_delete_owner         on public.issues;

drop policy if exists gp_select_table         on public.issue_participants;
drop policy if exists gp_update_self          on public.issue_participants;
drop policy if exists gp_delete_self_or_owner on public.issue_participants;

drop policy if exists votes_select_own_or_revealed on public.votes;
drop policy if exists votes_insert_own            on public.votes;
drop policy if exists votes_update_own            on public.votes;
drop policy if exists votes_delete_own            on public.votes;

drop policy if exists poko_read_game_channel   on realtime.messages;
drop policy if exists poko_write_game_presence on realtime.messages;

drop function if exists public.join_game(text, text);
drop function if exists public.close_round(uuid);
drop function if exists public.reopen_round(uuid);
drop function if exists public.start_round(uuid);
drop function if exists public.set_estimate(uuid, text);

drop function if exists private.poko_votes_guard();
drop function if exists private.poko_votes_after();
drop function if exists private.poko_games_before_insert();
drop function if exists private.poko_games_after_insert();
drop function if exists private.poko_games_before_update();
drop function if exists private.poko_participants_after();
drop function if exists private.poko_maybe_auto_close(uuid);
drop function if exists private.close_round_locked(uuid, text);
drop function if exists private.poko_broadcast(uuid, text, jsonb);
drop function if exists private.can_use_game_topic(text);
drop function if exists private.round_is_revealed(uuid, integer);
drop function if exists private.is_game_participant(uuid);
drop function if exists private.is_game_owner(uuid);


-- ---------------------------------------------------------------------------
-- 4. RLS helpers, rebuilt.
--
-- Unchanged but for the names. Still security definer for the same reason as
-- before: an issue_participants SELECT policy meaning "I see everyone at any
-- table I am sitting at" has to query issue_participants, and inlined that
-- raises 42P17 infinite recursion detected in policy.
-- ---------------------------------------------------------------------------
create function private.is_issue_participant(p_issue_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.issue_participants ip
     where ip.issue_id = p_issue_id
       and ip.user_id  = (select auth.uid())
  );
$$;

create function private.is_issue_owner(p_issue_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.issues i
     where i.id = p_issue_id
       and i.owner_id = (select auth.uid())
  );
$$;

-- Still `round < issues.round OR (round = issues.round AND closed)`, not
-- merely `closed`: written as just `closed`, every previous pass's cards would
-- vanish the moment the round was reopened.
create function private.round_is_revealed(p_issue_id uuid, p_round integer)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.issues i
     where i.id = p_issue_id
       and (p_round < i.round
            or (p_round = i.round and i.status = 'closed'))
  );
$$;

revoke all on function private.is_issue_participant(uuid)       from public;
revoke all on function private.is_issue_owner(uuid)             from public;
revoke all on function private.round_is_revealed(uuid, integer) from public;

-- Called from RLS policy expressions, which Postgres evaluates with the
-- privileges of the role running the query, so `authenticated` needs EXECUTE
-- or every policy fails with "permission denied". What keeps them safe is that
-- `private` is absent from config.toml api.schemas and each body hard-codes
-- (select auth.uid()), so no argument makes one answer a question about
-- somebody else.
grant execute on function private.is_issue_participant(uuid)       to authenticated;
grant execute on function private.is_issue_owner(uuid)             to authenticated;
grant execute on function private.round_is_revealed(uuid, integer) to authenticated;


-- ---------------------------------------------------------------------------
-- 5. Row level security, rebuilt.
-- ---------------------------------------------------------------------------

-- issues --------------------------------------------------------------------

create policy issues_select_participants on public.issues
for select to authenticated
using (
  owner_id = (select auth.uid())
  or (select private.is_issue_participant(id))
);

create policy issues_insert_own on public.issues
for insert to authenticated
with check ( owner_id = (select auth.uid()) );

-- Anonymous guests join and vote; they never own. RESTRICTIVE so it ANDs with
-- the policy above — a permissive policy would be OR-ed away and do nothing.
create policy issues_insert_not_anonymous on public.issues
as restrictive for insert to authenticated
with check ( ((select auth.jwt()) ->> 'is_anonymous') is distinct from 'true' );

-- Both USING and WITH CHECK: without the check, owner_id could be reassigned.
create policy issues_update_owner on public.issues
for update to authenticated
using      ( owner_id = (select auth.uid()) )
with check ( owner_id = (select auth.uid()) );

create policy issues_delete_owner on public.issues
for delete to authenticated
using ( owner_id = (select auth.uid()) );

-- issue_participants --------------------------------------------------------

create policy ip_select_table on public.issue_participants
for select to authenticated
using ( (select private.is_issue_participant(issue_id)) );

-- No INSERT policy, by design. The only way in is public.join_issue(slug).

create policy ip_update_self on public.issue_participants
for update to authenticated
using      ( user_id = (select auth.uid()) )
with check ( user_id = (select auth.uid()) );

create policy ip_delete_self_or_owner on public.issue_participants
for delete to authenticated
using (
  user_id = (select auth.uid())
  or (select private.is_issue_owner(issue_id))
);

-- votes ---------------------------------------------------------------------

-- THE BLIND-VOTE BOUNDARY. The `user_id = auth.uid()` branch is load-bearing
-- beyond reads: an UPDATE must first SELECT the row, so without it every
-- attempt to change your own card would silently affect 0 rows with no error.
create policy votes_select_own_or_revealed on public.votes
for select to authenticated
using (
  (select private.is_issue_participant(issue_id))
  and (
    user_id = (select auth.uid())
    or (select private.round_is_revealed(issue_id, round))
  )
);

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
-- 6. Round state machine, rebuilt.
-- ---------------------------------------------------------------------------

-- Broadcast must never be able to roll back a vote. A Realtime hiccup is a
-- missed animation; clients reconcile with a refetch on (re)subscribe.
create function private.poko_broadcast(p_issue_id uuid,
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
  perform realtime.send(p_payload, p_event, 'issue:' || p_issue_id::text, true);
exception when others then
  raise warning 'poko: realtime.send(%) failed: %', p_event, sqlerrm;
end;
$$;

-- THE single place a round is allowed to close, so the estimate rule and the
-- flip payload cannot drift between the automatic and manual paths.
--
-- `where status = 'voting' ... for update` makes it idempotent under
-- concurrency: if another transaction closed and committed, FOR UPDATE
-- re-reads the latest row version, re-checks the predicate, finds nothing and
-- returns. That is what lets N racing countdown timers all call it harmlessly.
create function private.close_round_locked(p_issue_id uuid, p_reason text)
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
  select i.round into v_round
    from public.issues i
   where i.id = p_issue_id
     and i.status = 'voting'
     for update;

  if not found then
    return;  -- already closed: a no-op, not an error
  end if;

  -- Unanimous or nothing. A modal value would record a number nobody agreed
  -- to, and an estimate the team did not agree is not an estimate.
  -- set_estimate() is the path for what discussion lands on.
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
   where v.issue_id = p_issue_id
     and v.round    = v_round;

  update public.issues
     set status        = 'closed',
         estimate      = v_estimate,
         closed_at     = now(),
         closed_reason = p_reason,
         updated_at    = now()
   where id = p_issue_id;

  -- THE FLIP: one message, every participant, the same instant. Values appear
  -- here and nowhere earlier, because a broadcast payload is identical for
  -- every subscriber and is NOT filtered by RLS. This is also the only moment
  -- round_is_revealed() starts returning true, so the socket and a REST read
  -- agree.
  perform private.poko_broadcast(p_issue_id, 'round_closed', jsonb_build_object(
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
create function private.poko_maybe_auto_close(p_issue_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_issue public.issues;
  v_seats integer;
  v_voted integer;
begin
  select * into v_issue from public.issues where id = p_issue_id for update;

  if not found or v_issue.status <> 'voting' or not v_issue.auto_close then
    return;
  end if;

  -- The denominator comes from the seat table, never from Presence: a flaky
  -- network would otherwise close rounds early.
  select count(*),
         count(*) filter (where ip.voted_round = v_issue.round)
    into v_seats, v_voted
    from public.issue_participants ip
   where ip.issue_id = p_issue_id;

  -- With one person at the table there is nothing to be blind about, and the
  -- owner would never get to sit on a card while waiting for the team.
  if v_seats >= 2 and v_voted = v_seats then
    perform private.close_round_locked(p_issue_id, 'all_voted');
  end if;
end;
$$;

-- Enforces what RLS deliberately does not: whether this move is legal now.
-- Each failure raises a distinct hint, which PostgREST surfaces, so the client
-- branches on error.hint instead of parsing prose.
create function private.poko_votes_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_issue public.issues;
  v_row   public.votes := coalesce(new, old);
begin
  -- THE serialization point for everything in this issue. Without it, two
  -- concurrent voters each count "have all voted?" under READ COMMITTED,
  -- neither sees the other's uncommitted row, and nobody closes the round.
  select * into v_issue from public.issues where id = v_row.issue_id for update;

  if not found then
    -- The issue itself is being deleted and this is the cascade. Nothing left
    -- to guard.
    if tg_op = 'DELETE' then
      return old;
    end if;

    raise exception 'poko: issue % not found', v_row.issue_id
      using errcode = 'no_data_found', hint = 'poko_issue_missing';
  end if;

  -- A cascade from a removed seat must also pass: the parent row is already
  -- gone by the time the referential action fires.
  if tg_op = 'DELETE' and not exists (
       select 1 from public.issue_participants ip
        where ip.issue_id = old.issue_id
          and ip.user_id  = old.user_id
     ) then
    return old;
  end if;

  if v_issue.status <> 'voting' then
    raise exception 'poko: round % is closed', v_issue.round
      using errcode = 'P0001', hint = 'poko_round_closed';
  end if;

  -- The deadline is enforced HERE, in the database. This is what makes the
  -- timebox real with no scheduler running at all: a purely client-side
  -- countdown would show 00:00 while votes kept landing.
  if v_issue.round_ends_at is not null and now() >= v_issue.round_ends_at then
    raise exception 'poko: round % has expired', v_issue.round
      using errcode = 'P0001', hint = 'poko_round_expired';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  -- Optimistic concurrency for free: a client whose round was reopened while
  -- it was choosing gets a clean error instead of voting into the wrong round.
  if new.round <> v_issue.round then
    raise exception 'poko: vote is for round %, issue is on round %',
                    new.round, v_issue.round
      using errcode = 'P0001', hint = 'poko_stale_round';
  end if;

  if new.value <> all (v_issue.deck_values) then
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

create function private.poko_votes_after()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row   public.votes := coalesce(new, old);
  v_round integer;
begin
  select i.round into v_round from public.issues i where i.id = v_row.issue_id;

  if tg_op = 'DELETE' then
    update public.issue_participants
       set voted_round = null, voted_at = null
     where issue_id = v_row.issue_id
       and user_id  = v_row.user_id;

    perform private.poko_broadcast(v_row.issue_id, 'vote_cleared',
      jsonb_build_object('user_id', v_row.user_id, 'round', v_round));
  else
    update public.issue_participants
       set voted_round = new.round, voted_at = now()
     where issue_id = new.issue_id
       and user_id  = new.user_id;

    -- "X has voted" carries WHO and WHEN. It cannot carry WHAT: the value is
    -- absent here, and votes is in no Realtime publication.
    perform private.poko_broadcast(new.issue_id, 'vote_cast',
      jsonb_build_object('user_id',  new.user_id,
                         'round',    new.round,
                         'voted_at', now()));
  end if;

  perform private.poko_maybe_auto_close(v_row.issue_id);
  return null;
end;
$$;

create trigger votes_after
after insert or update or delete on public.votes
for each row execute function private.poko_votes_after();

-- Slug for a new issue. The clock is NOT started here — start_round() does
-- that, so a countdown cannot begin before anyone has read the story.
create function private.poko_issues_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt integer := 0;
begin
  -- Always regenerated from the name, whatever the column default or the
  -- caller supplied: the slug is a capability token, so the client must never
  -- get to choose it.
  loop
    v_attempt := v_attempt + 1;
    new.slug := private.poko_slug(new.name);
    exit when not exists (select 1 from public.issues i where i.slug = new.slug);
    if v_attempt >= 5 then
      raise exception 'poko: could not allocate a unique slug'
        using errcode = 'P0001', hint = 'poko_slug_exhausted';
    end if;
  end loop;

  new.round_started_at := now();
  -- Left null on purpose. start_round() sets it.
  new.round_ends_at := null;

  return new;
end;
$$;

create trigger issues_before_insert
before insert on public.issues
for each row execute function private.poko_issues_before_insert();

-- An issue always has its owner at the table.
--
-- Votes hang off a seat, not off an account, so without this the person who
-- created the issue could not vote in it — they would have to follow their own
-- invite link first.
--
-- Must be security definer: issue_participants has no INSERT policy and no
-- INSERT grant, because join_issue is otherwise the only door in.
create function private.poko_issues_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.issue_participants (issue_id, user_id, display_name)
  values (new.id, new.owner_id, private.poko_display_name_for(new.owner_id))
  on conflict (issue_id, user_id) do nothing;

  return null;
end;
$$;

create trigger issues_after_insert
after insert on public.issues
for each row execute function private.poko_issues_after_insert();

-- A closed issue is a record of what the team decided, so its details stop
-- being editable: reopen the round first, which is a visible act everyone at
-- the table sees.
--
-- Only the *editable* columns are frozen. The round transitions all run
-- through this same trigger and none of them touch those columns, so they pass
-- straight through — a blanket "no updates while closed" would mean you could
-- never reopen anything.
create function private.poko_issues_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'closed'
     and (new.name is distinct from old.name
          or new.summary is distinct from old.summary
          or new.deck_name is distinct from old.deck_name
          or new.deck_values is distinct from old.deck_values
          or new.round_duration_seconds is distinct from old.round_duration_seconds) then
    raise exception 'poko: round % is closed', old.round
      using errcode = 'P0001', hint = 'poko_issue_closed';
  end if;

  -- Changing the deck under cards already on the table would leave votes whose
  -- value is no longer in the deck. Still needed for an OPEN round: the check
  -- above only covers closed ones.
  if new.deck_values is distinct from old.deck_values
     and exists (
       select 1 from public.votes v
        where v.issue_id = old.id
          and v.round    = old.round
     ) then
    raise exception 'poko: cards are already down in round %', old.round
      using errcode = 'P0001', hint = 'poko_deck_locked';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger issues_before_update
before update on public.issues
for each row execute function private.poko_issues_before_update();

-- A seat leaving can be the thing that completes a round: if three of four
-- have voted and the fourth walks out, the room must not hang forever waiting
-- for someone who left.
create function private.poko_participants_after()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.poko_broadcast(new.issue_id, 'participant_joined',
      jsonb_build_object('user_id', new.user_id,
                         'display_name', new.display_name));
  elsif tg_op = 'UPDATE' and new.display_name <> old.display_name then
    perform private.poko_broadcast(new.issue_id, 'participant_renamed',
      jsonb_build_object('user_id', new.user_id,
                         'display_name', new.display_name));
  elsif tg_op = 'DELETE' then
    perform private.poko_broadcast(old.issue_id, 'participant_left',
      jsonb_build_object('user_id', old.user_id));
  end if;

  -- The issue row may already be gone (cascade from an issues delete).
  if tg_op <> 'UPDATE' then
    perform private.poko_maybe_auto_close(coalesce(new.issue_id, old.issue_id));
  end if;

  return null;
end;
$$;

create trigger participants_after
after insert or update or delete on public.issue_participants
for each row execute function private.poko_participants_after();


-- ---------------------------------------------------------------------------
-- 7. Public RPCs, rebuilt.
--
-- Each: reject anon, lock the issue row, authorise, validate state, act.
-- These are the only security-definer functions in an exposed schema, so each
-- is explicitly revoked from PUBLIC/anon and granted to authenticated only —
-- Postgres grants EXECUTE to PUBLIC by default, which would otherwise make
-- them callable without a session.
-- ---------------------------------------------------------------------------

-- Possession of the slug IS the invitation, and there is no RLS formulation of
-- "you may read the row whose slug you can name" — hence this function. It is
-- the only way into issue_participants: no INSERT policy, no INSERT grant.
create function public.join_issue(p_slug text,
                                  p_display_name text default null)
returns public.issues
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_issue public.issues;
  v_uid   uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'poko: sign in before joining'
      using errcode = '28000', hint = 'poko_not_signed_in';
  end if;

  -- FOR UPDATE serialises the join against in-flight votes, so a join can
  -- never land half-way through an auto-close evaluation.
  select * into v_issue from public.issues where slug = p_slug for update;

  if not found then
    raise exception 'poko: no such room'
      using errcode = 'no_data_found', hint = 'poko_room_missing';
  end if;

  -- Aliased so the DO UPDATE can name the existing row: a schema-qualified
  -- reference is not valid in that clause.
  insert into public.issue_participants as ip (issue_id, user_id, display_name)
  values (v_issue.id, v_uid,
          left(coalesce(nullif(btrim(p_display_name), ''),
                        private.poko_display_name_for(v_uid)), 60))
  on conflict (issue_id, user_id) do update
     set display_name = coalesce(nullif(btrim(p_display_name), ''),
                                 ip.display_name);

  return v_issue;
end;
$$;

-- Owner always; any participant if the owner opted in; any participant once
-- the deadline has passed, because at that point the CLOCK is the authority —
-- and unlike a client's claim, that is a fact the database can verify.
create function public.close_round(p_issue_id uuid)
returns public.issues
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_issue   public.issues;
  v_uid     uuid := (select auth.uid());
  v_expired boolean;
begin
  if v_uid is null then
    raise exception 'poko: sign in first'
      using errcode = '28000', hint = 'poko_not_signed_in';
  end if;

  select * into v_issue from public.issues where id = p_issue_id for update;

  if not found then
    raise exception 'poko: no such issue'
      using errcode = 'no_data_found', hint = 'poko_issue_missing';
  end if;

  -- Must be at the table at all before authority is even considered.
  if v_issue.owner_id <> v_uid
     and not exists (
       select 1 from public.issue_participants ip
        where ip.issue_id = p_issue_id and ip.user_id = v_uid
     ) then
    raise exception 'poko: not at this table'
      using errcode = '42501', hint = 'poko_not_participant';
  end if;

  v_expired := v_issue.round_ends_at is not null
               and now() >= v_issue.round_ends_at;

  if v_issue.owner_id <> v_uid
     and not v_issue.allow_participant_reveal
     and not v_expired then
    raise exception 'poko: only the owner can close this round early'
      using errcode = '42501', hint = 'poko_not_owner';
  end if;

  perform private.close_round_locked(
    p_issue_id,
    case when v_expired then 'timeout' else 'manual' end
  );

  select * into v_issue from public.issues where id = p_issue_id;
  return v_issue;
end;
$$;

-- Owner only, matching reopen_round: setting the pace is a facilitation act,
-- and a participant who could start the clock could also start it on a room
-- that isn't ready.
create function public.start_round(p_issue_id uuid)
returns public.issues
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_issue public.issues;
  v_uid   uuid := (select auth.uid());
begin
  select * into v_issue from public.issues where id = p_issue_id for update;

  if not found or v_issue.owner_id <> v_uid then
    raise exception 'poko: only the owner can start the clock'
      using errcode = '42501', hint = 'poko_not_owner';
  end if;

  if v_issue.status <> 'voting' then
    raise exception 'poko: round % is closed', v_issue.round
      using errcode = 'P0001', hint = 'poko_round_closed';
  end if;

  if v_issue.round_duration_seconds is null then
    raise exception 'poko: this issue has no timebox to start'
      using errcode = 'P0001', hint = 'poko_no_timebox';
  end if;

  -- Already running. Returning quietly rather than raising makes a double
  -- click harmless, and refusing to re-derive the deadline means the clock
  -- cannot be quietly restarted to hand out more time.
  if v_issue.round_ends_at is not null then
    return v_issue;
  end if;

  update public.issues
     set round_started_at = now(),
         round_ends_at    = now()
                            + make_interval(secs => v_issue.round_duration_seconds),
         updated_at       = now()
   where id = p_issue_id
   returning * into v_issue;

  -- issue_updated rather than a new event name: every client needs to re-read
  -- and pick up the deadline, but a clock starting is not a moment to announce.
  perform private.poko_broadcast(p_issue_id, 'issue_updated', jsonb_build_object(
    'round',         v_issue.round,
    'round_ends_at', v_issue.round_ends_at,
    'server_now',    now()
  ));

  return v_issue;
end;
$$;

-- Owner only: letting anyone reopen is a griefing vector that erases a reveal.
-- Incrementing round clears every seat's voted_round with one write, and keeps
-- the previous pass's cards readable. The clock stays stopped — otherwise the
-- second round would be running before anyone had noticed it had restarted.
create function public.reopen_round(p_issue_id uuid)
returns public.issues
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_issue public.issues;
  v_uid   uuid := (select auth.uid());
begin
  select * into v_issue from public.issues where id = p_issue_id for update;

  if not found or v_issue.owner_id <> v_uid then
    raise exception 'poko: only the owner can reopen a round'
      using errcode = '42501', hint = 'poko_not_owner';
  end if;

  if v_issue.status <> 'closed' then
    return v_issue;  -- already open
  end if;

  update public.issues
     set round            = round + 1,
         status           = 'voting',
         estimate         = null,
         closed_at        = null,
         closed_reason    = null,
         round_started_at = now(),
         round_ends_at    = null,
         updated_at       = now()
   where id = p_issue_id
   returning * into v_issue;

  perform private.poko_broadcast(p_issue_id, 'round_reopened', jsonb_build_object(
    'round',         v_issue.round,
    'round_ends_at', v_issue.round_ends_at,
    'server_now',    now()
  ));

  return v_issue;
end;
$$;

-- The path for recording the number the team talked its way to, which is why
-- close_round takes no estimate argument: nobody invents one at close time.
create function public.set_estimate(p_issue_id uuid, p_estimate text)
returns public.issues
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_issue public.issues;
  v_uid   uuid := (select auth.uid());
begin
  select * into v_issue from public.issues where id = p_issue_id for update;

  if not found or v_issue.owner_id <> v_uid then
    raise exception 'poko: only the owner can record an estimate'
      using errcode = '42501', hint = 'poko_not_owner';
  end if;

  if v_issue.status <> 'closed' then
    raise exception 'poko: close the round before recording an estimate'
      using errcode = 'P0001', hint = 'poko_round_open';
  end if;

  -- issues_estimate_in_deck guarantees this is a card in this issue's deck.
  update public.issues
     set estimate = p_estimate, updated_at = now()
   where id = p_issue_id
   returning * into v_issue;

  perform private.poko_broadcast(p_issue_id, 'issue_updated',
    jsonb_build_object('estimate', p_estimate));

  return v_issue;
end;
$$;

revoke all on function public.join_issue(text, text)   from public, anon;
revoke all on function public.close_round(uuid)        from public, anon;
revoke all on function public.start_round(uuid)        from public, anon;
revoke all on function public.reopen_round(uuid)       from public, anon;
revoke all on function public.set_estimate(uuid, text) from public, anon;

grant execute on function public.join_issue(text, text)   to authenticated;
grant execute on function public.close_round(uuid)        to authenticated;
grant execute on function public.start_round(uuid)        to authenticated;
grant execute on function public.reopen_round(uuid)       to authenticated;
grant execute on function public.set_estimate(uuid, text) to authenticated;


-- ---------------------------------------------------------------------------
-- 8. Realtime authorization, rebuilt for the issue: topic prefix.
--
-- Postgres Changes payloads are filtered by RLS on the source table. Broadcast
-- and Presence are NOT — they authorise here, via RLS on realtime.messages,
-- together with `private: true` on the client.
-- ---------------------------------------------------------------------------
create function private.can_use_issue_topic(p_topic text)
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
    '^issue:([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$');

  if v_id is null then
    return false;
  end if;

  return private.is_issue_participant(v_id::uuid);
end;
$$;

revoke all on function private.can_use_issue_topic(text) from public;
grant execute on function private.can_use_issue_topic(text) to authenticated;

-- READ: participants receive broadcast and presence for their own issue only.
create policy poko_read_issue_channel on realtime.messages
for select to authenticated
using (
  realtime.messages.extension in ('broadcast', 'presence')
  and (select private.can_use_issue_topic((select realtime.topic())))
);

-- WRITE: PRESENCE ONLY. Clients may say "I'm here"; they may not broadcast.
-- Without this narrowing, any participant could emit a forged round_closed
-- carrying invented values to the whole room and defeat blind voting at the
-- presentation layer. Every real event originates from a trigger, which
-- Realtime delivers as supabase_admin and is not subject to this policy.
create policy poko_write_issue_presence on realtime.messages
for insert to authenticated
with check (
  realtime.messages.extension = 'presence'
  and (select private.can_use_issue_topic((select realtime.topic())))
);


-- ---------------------------------------------------------------------------
-- 9. issue_order — where YOU keep each issue in YOUR list.
--
-- Keyed on (user_id, issue_id) rather than a single column on `issues`,
-- because the list you see includes issues you only have a seat at. A shared
-- position column would mean the rows you don't own are undraggable for you
-- and get rearranged out from under you by whoever does own them; your
-- backlog order is a private working preference, not a fact about the issue.
--
-- Contiguous integers rather than gapped floats or a fractional index: the
-- client always sends the whole order, so there is nothing to interpolate
-- between, and a dense sequence cannot drift or run out of precision after
-- enough drops in the same spot.
--
-- Rows for issues you have never dragged simply do not exist. That absence is
-- meaningful — `listIssues` sorts unranked issues first, newest first — so a
-- brand-new issue appears at the top where you just made it, and a list nobody
-- has ever reordered behaves exactly as it did before this migration.
-- ---------------------------------------------------------------------------
create table public.issue_order (
  user_id    uuid    not null references auth.users (id)    on delete cascade,
  issue_id   uuid    not null references public.issues (id) on delete cascade,
  sort_order integer not null,
  updated_at timestamptz not null default now(),

  primary key (user_id, issue_id),

  constraint issue_order_sort_order_positive check (sort_order >= 1)
);

-- The PK already covers (user_id, ...) lookups; this one lets the read come
-- back in order without a sort, and covers the auth.users cascade.
create index issue_order_user_id_sort_order_idx
  on public.issue_order (user_id, sort_order);

-- Same revoke-first reasoning as section 8 of the first migration: Supabase's
-- default privileges hand `authenticated` table-wide write access the moment a
-- public table is created, so without this the narrowing below is a no-op.
revoke all on public.issue_order from anon, authenticated;

-- SELECT only. Every write goes through reorder_issues(), which is what lets
-- it filter the submitted ids down to issues you can actually see — the same
-- shape as join_issue() being the only door into issue_participants.
grant select on public.issue_order to authenticated;

alter table public.issue_order enable row level security;

create policy issue_order_select_own on public.issue_order
for select to authenticated
using ( user_id = (select auth.uid()) );

-- Replaces your whole order in one call.
--
-- Wholesale rather than "move issue X to position N": the client already knows
-- the full list it is rendering, one statement is atomic where a read-modify-
-- write pair is not, and an order that has drifted for any reason is repaired
-- by the next drop rather than accumulating.
--
-- Security definer because issue_order has no write grant at all. The `exists`
-- filter is why: ids you cannot see are dropped rather than refused, so a
-- stale tab whose list still holds an issue someone else just deleted saves
-- the rest of its order instead of failing whole.
create function public.reorder_issues(p_issue_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'poko: sign in first'
      using errcode = '28000', hint = 'poko_not_signed_in';
  end if;

  if p_issue_ids is null then
    raise exception 'poko: no order was sent'
      using errcode = 'P0001', hint = 'poko_order_missing';
  end if;

  -- A bound on the write, not a product limit: this is a security-definer
  -- function taking a client-supplied array, and nothing else here caps how
  -- much work one call can ask for.
  if coalesce(array_length(p_issue_ids, 1), 0) > 1000 then
    raise exception 'poko: too many issues in one reorder'
      using errcode = 'P0001', hint = 'poko_order_too_long';
  end if;

  delete from public.issue_order where user_id = v_uid;

  -- `distinct on` keeps the first occurrence of a repeated id, and
  -- row_number() renumbers after the visibility filter — so the stored
  -- sequence is always 1..n with no gaps, whatever the client sent.
  insert into public.issue_order (user_id, issue_id, sort_order)
  select v_uid, ranked.issue_id, row_number() over (order by ranked.ord)
    from (
      select distinct on (sent.issue_id) sent.issue_id, sent.ord
        from unnest(p_issue_ids) with ordinality as sent(issue_id, ord)
       where exists (
         select 1 from public.issues i
          where i.id = sent.issue_id
            and (i.owner_id = v_uid
                 or exists (
                   select 1 from public.issue_participants ip
                    where ip.issue_id = i.id
                      and ip.user_id  = v_uid
                 ))
       )
       order by sent.issue_id, sent.ord
    ) as ranked;
end;
$$;

revoke all on function public.reorder_issues(uuid[]) from public, anon;
grant execute on function public.reorder_issues(uuid[]) to authenticated;
