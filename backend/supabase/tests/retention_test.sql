-- Retention sweeps: the two jobs that make the privacy policy's retention
-- claims true. Run with:
--
--   pnpm db test:db
--
-- These are worth testing precisely because both failure directions are
-- silent. A sweep that deletes too little leaves guest names accumulating
-- forever and nothing anywhere reports it — the page still says they are gone.
-- A sweep that deletes too much takes a seated guest out of a live round
-- mid-vote, which looks like a bug in the room, not in a cron job nobody was
-- watching.
--
-- Time is driven by inserting rows with explicit `created_at` values in the
-- past rather than by waiting, and the retention window is passed as an
-- argument so the 24-month boundary can be asserted in milliseconds. The
-- DEFAULT argument is asserted separately, because the default is the part
-- that has to match the published policy.

begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

-- ---------------------------------------------------------------------------
-- Fixtures.
--
-- Four anonymous guests and one permanent user, covering every branch of the
-- sweep's WHERE clause: seated, unseated, too new to touch, and not anonymous
-- at all.
-- ---------------------------------------------------------------------------
\set owner_id      '11111111-0000-0000-0000-000000000001'
\set seated_id     '22222222-0000-0000-0000-000000000002'
\set unseated_id   '33333333-0000-0000-0000-000000000003'
\set fresh_id      '44444444-0000-0000-0000-000000000004'
\set permanent_id  '55555555-0000-0000-0000-000000000005'

insert into auth.users
  (instance_id, id, aud, role, email, is_anonymous, created_at, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000', :'owner_id', 'authenticated',
   'authenticated', 'owner@poko.test', false, now() - interval '30 days',
   '{"full_name":"Ama Owner"}'),

  -- Anonymous, old, and still seated at a live issue: must survive.
  ('00000000-0000-0000-0000-000000000000', :'seated_id', 'authenticated',
   'authenticated', null, true, now() - interval '30 days',
   '{"full_name":"Seated Guest"}'),

  -- Anonymous, old, no seat: the case the policy promises to clean up.
  ('00000000-0000-0000-0000-000000000000', :'unseated_id', 'authenticated',
   'authenticated', null, true, now() - interval '30 days',
   '{"full_name":"Abandoned Guest"}'),

  -- Anonymous, no seat, but inside the grace window: must survive, or the
  -- sweep races joinRoom() between signInAnonymously() and join_issue().
  ('00000000-0000-0000-0000-000000000000', :'fresh_id', 'authenticated',
   'authenticated', null, true, now() - interval '1 minute',
   '{"full_name":"Mid Join Guest"}'),

  -- Not anonymous and holds no seat. A permanent account with no rooms is an
  -- ordinary state, not an abandoned session.
  ('00000000-0000-0000-0000-000000000000', :'permanent_id', 'authenticated',
   'authenticated', 'quiet@poko.test', false, now() - interval '30 days',
   '{"full_name":"Quiet Member"}');

-- An issue owned by the permanent user, seating the one guest that must stay.
insert into public.issues (owner_id, name, deck_name, deck_values)
values (:'owner_id'::uuid, 'Retention fixture', 'Fibonacci',
        array['1','2','3','5','8']);

select id as issue_id from public.issues where name = 'Retention fixture'
\gset

insert into public.issue_participants (issue_id, user_id, display_name)
values (:'issue_id'::uuid, :'seated_id'::uuid, 'Seated Guest');


-- ---------------------------------------------------------------------------
-- The grant boundary.
--
-- Checked first, because everything below assumes these are unreachable from
-- a session. A sweep that a client can call with its own arguments is a
-- delete-everything endpoint.
-- ---------------------------------------------------------------------------
select ok(
  not has_function_privilege('authenticated',
    'private.poko_sweep_anonymous_users(interval,integer)', 'execute'),
  'authenticated cannot execute the anonymous-user sweep'
);

select ok(
  not has_function_privilege('anon',
    'private.poko_sweep_anonymous_users(interval,integer)', 'execute'),
  'anon cannot execute the anonymous-user sweep'
);

select ok(
  not has_function_privilege('authenticated',
    'private.poko_sweep_contact_messages(interval,integer)', 'execute'),
  'authenticated cannot execute the contact-message sweep'
);

select ok(
  not has_function_privilege('anon',
    'private.poko_sweep_contact_messages(interval,integer)', 'execute'),
  'anon cannot execute the contact-message sweep'
);

-- Invoker rights, deliberately. Security definer here would mean that widening
-- the execute grant by accident also hands out DELETE on auth.users.
select is(
  (select prosecdef from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and p.proname = 'poko_sweep_anonymous_users'),
  false,
  'the anonymous-user sweep runs with invoker rights, not security definer'
);


-- ---------------------------------------------------------------------------
-- Sweeping guests.
-- ---------------------------------------------------------------------------
select is(
  private.poko_sweep_anonymous_users(),
  1,
  'the sweep deletes exactly one session — the old, unseated, anonymous one'
);

select is_empty(
  format($$ select 1 from auth.users where id = %L $$, :'unseated_id'),
  'the abandoned guest session is gone, and its display name with it'
);

select isnt_empty(
  format($$ select 1 from auth.users where id = %L $$, :'seated_id'),
  'BLIND-ROUND SAFETY: a guest still seated at an issue survives the sweep'
);

select isnt_empty(
  format($$ select 1 from auth.users where id = %L $$, :'fresh_id'),
  'a session inside the grace window survives — joinRoom is not raced'
);

select isnt_empty(
  format($$ select 1 from auth.users where id = %L $$, :'permanent_id'),
  'a permanent account with no seats is never touched'
);

-- The promise in the policy is about the issue being deleted, so prove the
-- whole chain: deleting the issue drops the seat, which makes the session
-- sweepable on the next run.
delete from public.issues where id = :'issue_id'::uuid;

select is_empty(
  format($$ select 1 from public.issue_participants where user_id = %L $$,
         :'seated_id'),
  'deleting the issue cascaded the seat away'
);

select is(
  private.poko_sweep_anonymous_users(),
  1,
  'once the issue is deleted, the guest session becomes sweepable'
);

select is_empty(
  format($$ select 1 from auth.users where id = %L $$, :'seated_id'),
  'the guest session goes when the issue it belonged to is deleted'
);


-- ---------------------------------------------------------------------------
-- Sweeping contact messages.
-- ---------------------------------------------------------------------------
insert into public.contact_messages (email, message, privacy_accepted, created_at)
values
  ('old@poko.test',    'Two years and a day ago.', true,
   now() - interval '24 months' - interval '1 day'),
  ('recent@poko.test', 'Yesterday.',               true,
   now() - interval '1 day');

select is(
  private.poko_sweep_contact_messages(),
  1,
  'the default 24-month window deletes the older message and not the newer'
);

select is_empty(
  $$ select 1 from public.contact_messages where email = 'old@poko.test' $$,
  'the message past the retention window is gone'
);

select isnt_empty(
  $$ select 1 from public.contact_messages where email = 'recent@poko.test' $$,
  'a message inside the window is kept'
);

-- The other side of the published boundary.
--
-- Asserted behaviourally rather than by reading the function's default out of
-- the catalogue: proargdefaults is a pg_node_tree, and the one readable form
-- of it is source text that Postgres has already normalised ('24 months'
-- becomes '2 years'), so a text comparison would fail against a default that
-- is perfectly correct. Running the sweep proves the thing that matters.
--
-- With the assertion above, this pins the window between 23 and 24 months —
-- close enough that shortening it to a year, or dropping it to nothing, fails
-- here and sends the reader to the privacy policy page.
insert into public.contact_messages (email, message, privacy_accepted, created_at)
values ('boundary@poko.test', 'Twenty-three months ago.', true,
        now() - interval '23 months');

select is(
  private.poko_sweep_contact_messages(),
  0,
  'a message 23 months old is still inside the published 24-month window'
);

select * from finish();

rollback;
