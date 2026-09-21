-- Sprints, and a ticket key on the issue.
--
-- Poko stops being "a room per estimate" and becomes an agile estimation tool:
-- issues carry the key their tracker knows them by (PK-231) and sit in the
-- sprint being refined, so a session's worth of estimates reads as one list.
--
-- Three deliberate shapes here:
--
--   1. sprint_id IS NULLABLE. An issue does not need a sprint — the dialog's
--      sprint field is optional, and anything without one shows in an
--      "Uncategorized" group. That also means this migration rewrites no
--      existing rows: every issue created before today simply has no sprint.
--
--   2. A SPRINT IS ONE PERSON'S. It hangs off owner_id like an issue does, and
--      a trigger refuses to attach an issue to a sprint somebody else owns —
--      otherwise naming a stranger's sprint id would file your issue inside
--      their board. Participants can still READ the sprint of an issue they
--      are seated at, which is all the sidebar needs to group it.
--
--   3. ONE SPRINT PER NAME, PER OWNER, case-insensitively. The sprint field
--      creates on demand — type a name that isn't in the list and you get it —
--      so "Sprint 24" typed twice, or raced by a double submit, has to land on
--      the same row rather than quietly forking into two groups.
--
-- Deleting a sprint sets its issues' sprint_id to null rather than deleting
-- them: losing a sprint should cost you a grouping, never an estimate. They
-- reappear under Uncategorized.


-- ---------------------------------------------------------------------------
-- 1. sprints.
-- ---------------------------------------------------------------------------
create table public.sprints (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid()
               references auth.users (id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint sprints_name_not_blank check (btrim(name) <> ''),
  constraint sprints_name_length    check (length(name) <= 80)
);

-- "My sprints, newest first" — how the dialog offers them.
create index sprints_owner_id_created_at_idx
  on public.sprints (owner_id, created_at desc);

-- The uniqueness that makes create-on-demand safe. Expression index rather
-- than a plain unique constraint because the match has to ignore case: the
-- action trims before writing, so `lower(name)` is enough without btrim here.
create unique index sprints_owner_id_name_key
  on public.sprints (owner_id, lower(name));


-- ---------------------------------------------------------------------------
-- 2. issues gain a key and a sprint.
--
-- Both nullable with no default, so neither needs a table rewrite and no
-- existing row changes meaning. `key` is the tracker's identifier, not a
-- database key, and is deliberately NOT unique — the same ticket legitimately
-- comes back to be re-estimated in a later sprint.
-- ---------------------------------------------------------------------------
alter table public.issues
  add column key text,
  add column sprint_id uuid references public.sprints (id) on delete set null;

alter table public.issues
  add constraint issues_key_not_blank check (key is null or btrim(key) <> '');

alter table public.issues
  add constraint issues_key_length check (key is null or length(key) <= 32);

-- For the sidebar's grouping, and for the ON DELETE SET NULL sweep.
create index issues_sprint_id_idx on public.issues (sprint_id);

-- Column grants are additive, so these extend the existing lists without
-- touching them. Note what is still absent: status, round, estimate and slug.
grant insert (key, sprint_id) on public.issues to authenticated;
grant update (key, sprint_id) on public.issues to authenticated;


-- ---------------------------------------------------------------------------
-- 3. Visibility.
--
-- Security definer for the same reason as the other helpers: it reads
-- issue_participants, and a policy that did so inline would recurse. Its own
-- auth.uid() check means no argument makes it answer a question about someone
-- else's board.
--
-- It covers ONLY the shared case — "an issue in this sprint has me seated at
-- it". Ownership is checked inline in the policy instead, and that split is
-- load-bearing rather than tidy. See the policy below.
-- ---------------------------------------------------------------------------
create function private.has_sprint_seat(p_sprint_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.issues i
      join public.issue_participants ip on ip.issue_id = i.id
     where i.sprint_id = p_sprint_id
       and ip.user_id  = (select auth.uid())
  );
$$;

revoke all on function private.has_sprint_seat(uuid) from public;
grant execute on function private.has_sprint_seat(uuid) to authenticated;

alter table public.sprints enable row level security;

-- Yours, plus any sprint holding an issue you have a seat at — so the sidebar
-- can put a heading above someone else's issue you are estimating.
--
-- `owner_id = auth.uid()` MUST come first, as a plain column comparison, and
-- must not be folded into the helper. A SELECT policy also gates the RETURNING
-- clause of an INSERT, and a STABLE function reads the snapshot from the start
-- of the statement — which does not contain the row being inserted. Behind the
-- helper alone, creating a sprint and asking for it back (what PostgREST does
-- on every insert) failed with "new row violates row-level security policy".
-- Short-circuiting on the column keeps the common case from ever calling it.
-- This mirrors issues_select_participants, which is why that one never had the
-- problem.
create policy sprints_select_visible on public.sprints
for select to authenticated
using (
  owner_id = (select auth.uid())
  or (select private.has_sprint_seat(id))
);

create policy sprints_insert_own on public.sprints
for insert to authenticated
with check ( owner_id = (select auth.uid()) );

-- Anonymous guests join and vote; they own neither issues nor sprints.
-- RESTRICTIVE so it ANDs with the policy above rather than being OR-ed away.
create policy sprints_insert_not_anonymous on public.sprints
as restrictive for insert to authenticated
with check ( ((select auth.jwt()) ->> 'is_anonymous') is distinct from 'true' );

create policy sprints_update_owner on public.sprints
for update to authenticated
using      ( owner_id = (select auth.uid()) )
with check ( owner_id = (select auth.uid()) );

create policy sprints_delete_owner on public.sprints
for delete to authenticated
using ( owner_id = (select auth.uid()) );

-- Same revoke-first reasoning as the first migration: Supabase's default
-- privileges hand `authenticated` table-wide write access the moment a public
-- table is created, so without this the narrowing below is a no-op.
revoke all on public.sprints from anon, authenticated;

grant select        on public.sprints to authenticated;
grant insert (name) on public.sprints to authenticated;
grant update (name) on public.sprints to authenticated;
grant delete        on public.sprints to authenticated;


-- ---------------------------------------------------------------------------
-- 4. An issue may only sit in a sprint its own owner owns.
--
-- Enforced in the triggers rather than the server action so it holds however
-- the write arrives, including a direct PATCH from the browser. RLS cannot
-- express it: the issues policies check who is writing, not whether the
-- sprint_id being written points somewhere the writer is entitled to file it.
-- ---------------------------------------------------------------------------
create function private.poko_issue_sprint_is_owned(p_sprint_id uuid,
                                                   p_owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_sprint_id is null
      or exists (
           select 1 from public.sprints s
            where s.id = p_sprint_id
              and s.owner_id = p_owner_id
         );
$$;

revoke all on function private.poko_issue_sprint_is_owned(uuid, uuid) from public;

-- Slug for a new issue, plus the sprint check. The clock is NOT started here —
-- start_round() does that, so a countdown cannot begin before anyone has read
-- the story.
create or replace function private.poko_issues_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt integer := 0;
begin
  if not private.poko_issue_sprint_is_owned(new.sprint_id, new.owner_id) then
    raise exception 'poko: that sprint is not yours'
      using errcode = '42501', hint = 'poko_sprint_not_yours';
  end if;

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

-- A closed issue is a record of what the team decided, so its details stop
-- being editable: reopen the round first, which is a visible act everyone at
-- the table sees. `key` joins that set — it names the ticket the estimate
-- belongs to — but `sprint_id` deliberately does NOT: filing a settled
-- estimate under the right sprint is housekeeping, and should not require
-- reopening a round to do it.
--
-- Only the *editable* columns are frozen. The round transitions all run
-- through this same trigger and none of them touch those columns, so they pass
-- straight through — a blanket "no updates while closed" would mean you could
-- never reopen anything.
create or replace function private.poko_issues_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.poko_issue_sprint_is_owned(new.sprint_id, new.owner_id) then
    raise exception 'poko: that sprint is not yours'
      using errcode = '42501', hint = 'poko_sprint_not_yours';
  end if;

  if old.status = 'closed'
     and (new.name is distinct from old.name
          or new.key is distinct from old.key
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


-- ---------------------------------------------------------------------------
-- 5. Keeping updated_at honest on sprints.
--
-- The issues table gets this from its own before-update trigger; sprints has
-- only the one editable column, so it needs its own.
-- ---------------------------------------------------------------------------
create function private.poko_sprints_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger sprints_before_update
before update on public.sprints
for each row execute function private.poko_sprints_before_update();
