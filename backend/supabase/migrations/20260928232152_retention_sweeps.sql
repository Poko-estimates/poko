-- Retention, enforced rather than promised. The privacy policy claims guest
-- sessions go with their issue and contact messages last 24 months; neither
-- had any mechanism behind it, which under GDPR Art. 5(1)(e) is worse than
-- claiming nothing.
--
-- Safe only because anonymous users may not OWN anything (see
-- `issues_insert_not_anonymous` in 20260907004427) — drop that policy and this
-- sweep becomes data loss.
--
-- NOT security definer, deliberately: pg_cron already runs these as postgres,
-- so invoker rights mean a widened grant still cannot delete from auth.users.

-- pg_cron is preloaded on Supabase and locally, with database_name 'postgres'.
create extension if not exists pg_cron;


-- Abandoned guest sessions. The condition is "no seat anywhere", not "old" —
-- a guest still seated has to keep rendering in that room's roster.
--
-- p_grace covers the gap between signInAnonymously() and join_issue() in
-- joinRoom(), and sweeps up sessions whose join failed outright.
create or replace function private.poko_sweep_anonymous_users(
  p_grace interval default interval '1 hour',
  p_limit integer default 1000
)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  with doomed as (
    select u.id
      from auth.users u
     where u.is_anonymous
       and u.created_at < now() - p_grace
       -- The seat is the only thing that makes a session worth keeping.
       and not exists (
             select 1
               from public.issue_participants p
              where p.user_id = u.id
           )
     order by u.created_at
     limit p_limit
     -- Overlapping runs take different rows instead of queueing.
     for update skip locked
  )
  delete from auth.users u
   using doomed d
   where u.id = d.id;

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;


-- 24 months is the figure the privacy policy publishes. A parameter so a test
-- can prove the boundary without waiting two years, but the DEFAULT is the
-- promise — change it here and change the policy page in the same commit.
create or replace function private.poko_sweep_contact_messages(
  p_retention interval default interval '24 months',
  p_limit integer default 1000
)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  with doomed as (
    select m.id
      from public.contact_messages m
     where m.created_at < now() - p_retention
     order by m.created_at
     limit p_limit
     for update skip locked
  )
  delete from public.contact_messages m
   using doomed d
   where m.id = d.id;

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;


-- Belt and braces: `private` is already unreachable from PostgREST, but
-- without these a widened USAGE would expose the sweep to clients, and
-- poko_sweep_anonymous_users(interval '0 seconds') empties every guest seat.
revoke all on function private.poko_sweep_anonymous_users(interval, integer)
  from public, anon, authenticated;
revoke all on function private.poko_sweep_contact_messages(interval, integer)
  from public, anon, authenticated;


-- cron.schedule() upserts on job name, so this is idempotent. Guests hourly
-- because that lag is a sentence in the privacy policy; messages daily.
select cron.schedule(
  'poko-sweep-anonymous-users',
  '17 * * * *',
  $job$ select private.poko_sweep_anonymous_users(); $job$
);

select cron.schedule(
  'poko-sweep-contact-messages',
  '42 3 * * *',
  $job$ select private.poko_sweep_contact_messages(); $job$
);
