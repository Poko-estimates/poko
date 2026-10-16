-- Retire the contact form's inbox. The contact page is now a mailto, so
-- nothing writes here any more.
--
-- Dropped rather than left empty: the table carried an INSERT grant for
-- `anon`, which without a form behind it is just an unused public write
-- endpoint. DESTRUCTIVE — export any real messages first.

-- The sweep goes first: against a missing table it would raise 42P01 nightly
-- into cron.job_run_details, where nobody is looking.
select cron.unschedule('poko-sweep-contact-messages');

drop function if exists private.poko_sweep_contact_messages(interval, integer);

-- Policies, grants and indexes go with it. Nothing referenced this table back,
-- so there is no dependent object to cascade into.
drop table if exists public.contact_messages;
