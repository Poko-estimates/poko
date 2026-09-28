-- Retention, enforced rather than promised.
--
-- The privacy policy makes two statements about how long data lives:
--
--   1. A guest session "goes when the issue it belongs to is deleted."
--   2. Contact messages are "kept for up to 24 months."
--
-- Neither was true. Deleting an issue cascades the seat and the votes, but the
-- anonymous `auth.users` row survived it — carrying the name the guest typed,
-- in raw_user_meta_data, forever. Nothing has ever deleted a contact message.
-- A published retention limit with no mechanism behind it is worse than saying
-- nothing: it is documentary evidence of a rule you are in breach of by
-- default, under GDPR Art. 5(1)(e) and the equivalent in Act 843.
--
-- The cleanup cascade this file finally builds is the one the original schema
-- already assumed. See the comment on `issues_insert_not_anonymous` in
-- 20260907004427: anonymous users are barred from OWNING anything precisely so
-- that deleting one can never take a real user's issue with it. That
-- restrictive policy is what makes this migration safe, and removing it would
-- turn this sweep into data loss.
--
-- Two deliberate choices worth understanding before editing:
--
--   * These functions are NOT security definer. They delete from auth.users,
--     which needs privileges the app roles do not have — and pg_cron already
--     runs them as `postgres`, which does. Invoker rights mean that if the
--     execute grant below is ever widened by accident, the caller still cannot
--     delete anything they could not have deleted by hand. Security definer
--     would hand that power to whoever could reach the function.
--   * Every sweep is bounded and takes `for update skip locked`. A retention
--     job is the one thing in this database that can touch an unbounded number
--     of rows, and an unbounded DELETE holds row locks for its whole runtime.
--     Capping the batch keeps each run short; the schedule catches up.


-- ---------------------------------------------------------------------------
-- 0. pg_cron.
--
-- Already in shared_preload_libraries on Supabase and in the local container,
-- with cron.database_name = 'postgres', so the jobs below run in this
-- database. Jobs are owned by whoever schedules them — `postgres`, here,
-- because that is who applies migrations.
-- ---------------------------------------------------------------------------
create extension if not exists pg_cron;


-- ---------------------------------------------------------------------------
-- 1. Abandoned guest sessions.
--
-- "No seat anywhere" is the condition, not "old". A guest who is still seated
-- at a live issue is part of that room's roster and their name still has to
-- render, so age alone must never be the trigger — the seat disappearing is.
-- Once the last seat is gone the session refers to nothing and holds only a
-- display name, which is exactly what the policy says we stop keeping.
--
-- p_grace exists for one specific race: joinRoom() calls signInAnonymously()
-- and then join_issue() as two statements, so for a few milliseconds a real
-- guest has a session and no seat. An hour is many orders of magnitude more
-- than that window needs, and it is also what covers a failed join — someone
-- who followed a dead link gets a session, no seat, and is gone within the
-- hour rather than kept indefinitely.
--
-- Deleting the auth.users row cascades to profiles (the after-insert trigger
-- gives every user one, anonymous included), and sets contact_messages.user_id
-- to null rather than retracting feedback the guest sent.
-- ---------------------------------------------------------------------------
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
       -- The seat is the only thing that makes a guest session worth keeping.
       and not exists (
             select 1
               from public.issue_participants p
              where p.user_id = u.id
           )
     order by u.created_at
     limit p_limit
     -- Two overlapping runs take different rows instead of one waiting on the
     -- other. Without SKIP LOCKED a slow sweep would block the next one for
     -- its whole runtime.
     for update skip locked
  )
  delete from auth.users u
   using doomed d
   where u.id = d.id;

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;


-- ---------------------------------------------------------------------------
-- 2. Contact messages past their retention window.
--
-- 24 months is the figure published in the privacy policy. It is a parameter
-- rather than a literal so a test can prove the boundary without waiting two
-- years, but the DEFAULT is the promise — change it here and change the policy
-- page in the same commit, or the two drift apart silently.
--
-- contact_messages_created_at_idx is a DESC index, which still serves this
-- ascending range scan: btrees are readable in either direction.
-- ---------------------------------------------------------------------------
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


-- ---------------------------------------------------------------------------
-- 3. The grant boundary.
--
-- `private` is not in config.toml's api.schemas, so PostgREST cannot see these
-- and the app roles have no USAGE on the schema. The revokes are belt and
-- braces for the day someone exposes `private` or grants USAGE for an
-- unrelated reason: without them, both functions would become callable, and
-- `poko_sweep_anonymous_users(interval '0 seconds')` from a client would
-- delete every guest session in the database mid-round.
-- ---------------------------------------------------------------------------
revoke all on function private.poko_sweep_anonymous_users(interval, integer)
  from public, anon, authenticated;
revoke all on function private.poko_sweep_contact_messages(interval, integer)
  from public, anon, authenticated;


-- ---------------------------------------------------------------------------
-- 4. The schedule.
--
-- cron.schedule() upserts on job name, so re-running this is idempotent and a
-- later migration can retime a job by scheduling the same name again.
--
-- Guests hourly, messages daily. The asymmetry is deliberate: the guest sweep
-- is what makes a sentence in the privacy policy true, so its worst-case lag
-- after an issue is deleted should be hours (grace + one tick), not days. A
-- message that is 24 months and 20 hours old is not a breach of anything.
--
-- Offset minutes rather than :00 so these do not pile onto every other
-- cron-shaped thing in the cluster. Failures land in cron.job_run_details,
-- which is the first place to look if guest rows start accumulating.
-- ---------------------------------------------------------------------------
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
