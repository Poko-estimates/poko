-- Retire the contact form's inbox.
--
-- The contact page is now a button that opens the reader's own mail client.
-- Messages arrive in a mailbox a human already reads, and nothing in the app
-- inserts into this table any more.
--
-- DROPPING IT RATHER THAN LEAVING IT EMPTY, for a reason that outlives the
-- form. `contact_messages` carried an INSERT policy and an INSERT grant for
-- `anon` — it was the one table on the internet's side of the fence, and that
-- was a fair bargain while a page we shipped was the thing writing to it. With
-- the form gone the grant does not become harmless, it becomes an unused
-- public write endpoint: anyone who can reach PostgREST could still fill the
-- table with 4 KB rows, and no screen anywhere would show it happening.
--
-- DESTRUCTIVE. Any message already received goes with the table. Export first
-- if this reaches an environment that has real ones:
--
--   select * from public.contact_messages order by created_at;
--
-- Forward-only, so 20260921163547 stays exactly as written. Reading the two
-- together is the history: a write-only inbox, and the day it stopped earning
-- its keep.


-- ---------------------------------------------------------------------------
-- 1. The nightly sweep goes first.
--
-- Order matters. The job runs `private.poko_sweep_contact_messages()`, which
-- against a missing table would raise 42P01 every night at 03:42 — failing
-- into cron.job_run_details, where nobody is looking. That is precisely the
-- silent rot the sweep was added to prevent, so it should not be the thing
-- left behind doing it.
-- ---------------------------------------------------------------------------
select cron.unschedule('poko-sweep-contact-messages');

drop function if exists private.poko_sweep_contact_messages(interval, integer);


-- ---------------------------------------------------------------------------
-- 2. The table.
--
-- Its policies, grants and indexes go with it. `user_id` referenced
-- auth.users with ON DELETE SET NULL and nothing referenced this table back,
-- so there is no dependent object for the drop to cascade into.
-- ---------------------------------------------------------------------------
drop table if exists public.contact_messages;
