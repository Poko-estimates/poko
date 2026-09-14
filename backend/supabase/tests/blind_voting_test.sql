-- Blind voting, round lifecycle, per-user ordering, and the grant boundary.
--
-- Every assertion here maps to a specific way this schema could fail SILENTLY
-- — correct-looking code, no error, wrong data visible. Run with:
--
--   pnpm db test:db
--
-- Each pg_temp.act_as() call impersonates a signed-in user by setting the role
-- and the JWT claims auth.uid() reads, which is how RLS gets exercised as the
-- roles that matter rather than as postgres.
--
-- Two structural notes, both learned the hard way:
--
--   * The slug and id are captured with \gset while the OWNER can see the
--     issue, then passed around as literals. Not a convenience: someone who
--     has not joined cannot read the issue row at all, so they could never
--     look the slug up. They know it because it was in the link they were sent
--     — which is exactly why join_issue() has to be security definer.
--   * With two seats, the second vote AUTO-CLOSES the round. So anything that
--     needs an open round has to happen while only one seat has voted.

begin;

create extension if not exists pgtap with schema extensions;

select plan(65);

-- ---------------------------------------------------------------------------
-- Fixtures. Three permanent users and one guest, created as postgres.
-- ---------------------------------------------------------------------------
\set owner_id    '11111111-1111-1111-1111-111111111111'
\set player_id   '22222222-2222-2222-2222-222222222222'
\set outsider_id '33333333-3333-3333-3333-333333333333'
\set guest_id    '44444444-4444-4444-4444-444444444444'

insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000', :'owner_id',    'authenticated', 'authenticated', 'owner@poko.test',    '{"full_name":"Ama Owner"}'),
  ('00000000-0000-0000-0000-000000000000', :'player_id',   'authenticated', 'authenticated', 'player@poko.test',   '{"full_name":"Kojo Player"}'),
  ('00000000-0000-0000-0000-000000000000', :'outsider_id', 'authenticated', 'authenticated', 'outsider@poko.test', '{"full_name":"Nosy Outsider"}'),
  ('00000000-0000-0000-0000-000000000000', :'guest_id',    'authenticated', 'authenticated', null,                 '{}');

create or replace function pg_temp.act_as(p_uid uuid, p_anonymous boolean default false)
returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid::text,
                      'role', 'authenticated',
                      'is_anonymous', p_anonymous)::text, true);
end; $$;

create or replace function pg_temp.act_as_postgres() returns void
language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end; $$;


-- ---------------------------------------------------------------------------
-- Creating an issue
-- ---------------------------------------------------------------------------
select pg_temp.act_as(:'owner_id');

insert into public.issues (name, deck_name, deck_values)
values ('Sprint 24 refinement', 'Fibonacci',
        array['0','1','2','3','5','8','13','21','?','☕']);

select isnt_empty(
  $$ select 1 from public.issues where name = 'Sprint 24 refinement' $$,
  'owner can create an issue and read it back'
);

select matches(
  (select slug from public.issues where name = 'Sprint 24 refinement'),
  '^sprint-24-refinement-[0-9a-f]{12}$',
  'slug is the name prefix plus 12 hex characters of entropy'
);

select id as issue_id, slug as issue_slug
  from public.issues where name = 'Sprint 24 refinement'
\gset

-- Creating an issue seats its owner, so they can vote without following their
-- own invite link first.
select is(
  (select display_name from public.issue_participants
    where user_id = :'owner_id'::uuid),
  'Ama Owner',
  'creating an issue seats the owner, named from their account'
);

-- Deck validation is enforced by the database, not only by the create dialog.
select throws_ok(
  $$ insert into public.issues (name, deck_name, deck_values)
     values ('One card', 'Silly', array['1']) $$,
  23514, null,
  'a deck with fewer than 2 values is rejected'
);

select throws_ok(
  $$ insert into public.issues (name, deck_name, deck_values)
     values ('Dupes', 'Silly', array['1','1','2']) $$,
  23514, null,
  'a deck with duplicate values is rejected'
);


-- ---------------------------------------------------------------------------
-- Guests may join and vote, but never own
-- ---------------------------------------------------------------------------
select pg_temp.act_as(:'guest_id', true);

select throws_ok(
  $$ insert into public.issues (name, deck_name, deck_values)
     values ('Guest issue', 'Fibonacci', array['1','2','3']) $$,
  42501, null,
  'an anonymous user cannot own an issue (restrictive policy)'
);


-- ---------------------------------------------------------------------------
-- Joining is only possible through join_issue()
-- ---------------------------------------------------------------------------
select pg_temp.act_as(:'player_id');

select throws_ok(
  format($$ insert into public.issue_participants (issue_id, user_id, display_name)
            values (%L, %L, 'Sneaky') $$, :'issue_id', :'player_id'),
  42501, null,
  'a client cannot insert a seat directly — join_issue() is the only door'
);

select throws_ok(
  $$ select public.join_issue('no-such-room-abcdef123456') $$,
  'P0002', null,
  'joining an unknown slug raises rather than silently doing nothing'
);

select pg_temp.act_as(:'owner_id');
select public.join_issue(:'issue_slug', 'Ama');

select pg_temp.act_as(:'player_id');
select public.join_issue(:'issue_slug', 'Kojo');

select lives_ok(
  format($$ select public.join_issue(%L, 'Kojo K.') $$, :'issue_slug'),
  'join_issue is idempotent — re-opening the link is safe'
);

select is(
  (select count(*)::int from public.issue_participants),
  2,
  'the idempotent re-join did not create a second seat'
);


-- ---------------------------------------------------------------------------
-- A non-participant sees nothing at all
-- ---------------------------------------------------------------------------
select pg_temp.act_as(:'outsider_id');

select is_empty(
  $$ select 1 from public.issues $$,
  'someone who was never invited cannot see the issue'
);

select is_empty(
  $$ select 1 from public.issue_participants $$,
  'someone who was never invited cannot see the roster'
);


-- ---------------------------------------------------------------------------
-- ROUND 1 — the central test: blind voting, then a split vote
-- ---------------------------------------------------------------------------
select pg_temp.act_as(:'owner_id');
insert into public.votes (issue_id, round, value) values (:'issue_id', 1, '5');

select pg_temp.act_as(:'player_id');

select is(
  (select count(*)::int from public.votes),
  0,
  'BLIND: mid-round, a participant cannot see another participant''s vote'
);

select is(
  (select count(*)::int from public.issue_participants where voted_round is not null),
  1,
  'progress is visible: the roster shows who has a card down'
);

select throws_ok(
  format($$ insert into public.votes (issue_id, round, value)
            values (%L, 1, '999') $$, :'issue_id'),
  'P0001', null,
  'a value outside the deck is rejected by the guard trigger'
);

-- The owner changes their own card while the round is still open. If the votes
-- SELECT policy ever loses its `user_id = auth.uid()` branch, this silently
-- affects 0 rows with no error raised anywhere.
select pg_temp.act_as(:'owner_id');
update public.votes set value = '8' where issue_id = :'issue_id';

select is(
  (select value from public.votes where user_id = :'owner_id'::uuid),
  '8',
  'changing your own card works (UPDATE needs a matching SELECT policy)'
);

select pg_temp.act_as_postgres();
select is(
  (select status from public.issues where id = :'issue_id'::uuid),
  'voting',
  'one of two seats voting leaves the round open'
);

-- The second card lands: 8 vs 3, so the round closes without consensus.
select pg_temp.act_as(:'player_id');
insert into public.votes (issue_id, round, value) values (:'issue_id', 1, '3');

select pg_temp.act_as_postgres();

select is(
  (select status from public.issues where id = :'issue_id'::uuid),
  'closed',
  'the round auto-closed once every seat had a card down'
);

select is(
  (select closed_reason from public.issues where id = :'issue_id'::uuid),
  'all_voted',
  'closed_reason records how the round ended'
);

select is(
  (select estimate from public.issues where id = :'issue_id'::uuid),
  null,
  'a split vote records NO estimate (unanimous or nothing)'
);


-- ---------------------------------------------------------------------------
-- After the flip, everything is readable — that IS the flip
-- ---------------------------------------------------------------------------
select pg_temp.act_as(:'player_id');

select is(
  (select count(*)::int from public.votes),
  2,
  'FLIP: once the round is closed, every participant''s card is readable'
);

select throws_ok(
  format($$ update public.votes set value = '13' where issue_id = %L $$, :'issue_id'),
  'P0001', null,
  'no vote can be cast or changed after the round closes'
);

-- Blind voting's real guarantee: a participant cannot move the round at all.
-- This fails on the missing column grant, before RLS is even consulted.
select throws_ok(
  $$ update public.issues set status = 'closed' $$,
  42501, null,
  'a participant cannot write status — no column grant exists'
);

select throws_ok(
  format($$ select public.reopen_round(%L) $$, :'issue_id'),
  42501, null,
  'only the owner can reopen a round'
);


-- ---------------------------------------------------------------------------
-- ROUND 2 — reopening keeps history, and a unanimous vote records an estimate
-- ---------------------------------------------------------------------------
select pg_temp.act_as(:'owner_id');
select public.reopen_round(:'issue_id');

select pg_temp.act_as_postgres();

select is(
  (select round from public.issues where id = :'issue_id'::uuid),
  2,
  'reopening advanced the round counter rather than deleting votes'
);

-- Scoped to this issue on purpose. These run as postgres, which bypasses RLS,
-- so an unscoped count would silently include every other issue in the
-- database and the assertion would only hold on a freshly reset one.
select is(
  (select count(*)::int from public.issue_participants
    where issue_id = :'issue_id'::uuid and voted_round = 2),
  0,
  'reopening cleared every seat with one write'
);

select is(
  (select count(*)::int from public.votes
    where issue_id = :'issue_id'::uuid and round = 1),
  2,
  'the previous round''s cards survive a reopen and stay readable'
);

select pg_temp.act_as(:'owner_id');
insert into public.votes (issue_id, round, value) values (:'issue_id', 2, '3');
select pg_temp.act_as(:'player_id');
insert into public.votes (issue_id, round, value) values (:'issue_id', 2, '3');

select pg_temp.act_as_postgres();
select is(
  (select estimate from public.issues where id = :'issue_id'::uuid),
  '3',
  'a unanimous vote records the agreed card as the estimate'
);


-- ---------------------------------------------------------------------------
-- ROUND 3 — a seat leaving can be what completes a round
--
-- Three seats here on purpose. poko_maybe_auto_close requires seats >= 2, so a
-- room that drops to a single seat deliberately stays open: that state is
-- indistinguishable from a solo owner waiting for the team to arrive, and
-- auto-closing it would be wrong. The hang case that DOES need handling is a
-- room of three where the last holdout walks out.
-- ---------------------------------------------------------------------------
select pg_temp.act_as(:'guest_id', true);
select public.join_issue(:'issue_slug', 'Guest');

select is(
  (select count(*)::int from public.issue_participants),
  3,
  'an anonymous guest can take a seat at the table'
);

select pg_temp.act_as(:'owner_id');
select public.reopen_round(:'issue_id');
insert into public.votes (issue_id, round, value) values (:'issue_id', 3, '5');

-- A guest votes like anyone else.
select pg_temp.act_as(:'guest_id', true);
insert into public.votes (issue_id, round, value) values (:'issue_id', 3, '5');

select pg_temp.act_as_postgres();
select is(
  (select status from public.issues where id = :'issue_id'::uuid),
  'voting',
  'round 3 is open with two of three cards down'
);

-- The last holdout walks out without voting. The room must not hang forever
-- waiting for someone who left.
select pg_temp.act_as(:'player_id');
delete from public.issue_participants where user_id = :'player_id'::uuid;

select pg_temp.act_as_postgres();
select is(
  (select status from public.issues where id = :'issue_id'::uuid),
  'closed',
  'a seat leaving re-evaluates auto-close, so the round settles'
);

select is(
  (select count(*)::int from public.votes where user_id = :'player_id'::uuid),
  0,
  'leaving took that person''s cards with them (composite FK cascade)'
);

-- Leaving after a reveal must not raise: the cascade delete of that person's
-- votes fires the BEFORE DELETE guard while the round is closed.
select pg_temp.act_as(:'owner_id');
select lives_ok(
  format($$ delete from public.issue_participants
             where issue_id = %L and user_id = %L $$, :'issue_id', :'owner_id'),
  'leaving the table after a reveal succeeds (cascade-delete guard)'
);


-- ---------------------------------------------------------------------------
-- Editing an issue, and the one edit that has to be refused
-- ---------------------------------------------------------------------------
-- Its own issue, still open. The narrative issue above has been through three
-- rounds and is closed by this point, and a closed issue is frozen — so
-- reusing it here would test the wrong rule.
select pg_temp.act_as(:'owner_id');

insert into public.issues (name, deck_name, deck_values, round_duration_seconds)
values ('Open and editable', 'Fibonacci', array['1','2','3'], 60);

select id as editable_id, slug as editable_slug
  from public.issues where name = 'Open and editable'
\gset

select pg_temp.act_as(:'player_id');
select public.join_issue(:'editable_slug', 'Kojo');

-- One card of two: enough to lock the deck, not enough to auto-close.
select pg_temp.act_as(:'owner_id');
insert into public.votes (issue_id, round, value) values (:'editable_id', 1, '2');

select lives_ok(
  format($$ update public.issues set name = 'Renamed mid-round' where id = %L $$,
         :'editable_id'),
  'the owner can rename an open issue mid-round'
);

-- Swapping the deck now would leave that card with a face the deck no longer has.
select throws_ok(
  format($$ update public.issues set deck_values = array['XS','S','M']
             where id = %L $$, :'editable_id'),
  'P0001', null,
  'the deck cannot be changed once cards are down'
);

-- The timebox is still fair game: it only affects the next round's clock.
select lives_ok(
  format($$ update public.issues set round_duration_seconds = 300
             where id = %L $$, :'editable_id'),
  'the timebox can be changed mid-round'
);

-- A closed round's details are frozen; reopening is the way back to editing.
-- Uses its own issue so the round-1 narrative above is undisturbed.
select pg_temp.act_as(:'owner_id');

insert into public.issues (name, deck_name, deck_values, round_duration_seconds)
values ('Closed and frozen', 'Fibonacci', array['1','2','3'], 60);

select id as frozen_id from public.issues where name = 'Closed and frozen'
\gset

insert into public.votes (issue_id, round, value) values (:'frozen_id', 1, '2');
select public.close_round(:'frozen_id');

select throws_ok(
  format($$ update public.issues set name = 'Renamed while closed'
             where id = %L $$, :'frozen_id'),
  'P0001', null,
  'a closed issue cannot be renamed'
);

select throws_ok(
  format($$ update public.issues set summary = 'Sneaky' where id = %L $$,
         :'frozen_id'),
  'P0001', null,
  'a closed issue cannot have its summary changed'
);

-- The round transitions have to keep working through the same trigger.
select lives_ok(
  format($$ select public.set_estimate(%L, '2') $$, :'frozen_id'),
  'set_estimate still works on a closed issue'
);

select lives_ok(
  format($$ select public.reopen_round(%L) $$, :'frozen_id'),
  'reopen_round still works on a closed issue'
);

select lives_ok(
  format($$ update public.issues set name = 'Renamed after reopening'
             where id = %L $$, :'frozen_id'),
  'reopening unfreezes the details'
);

select pg_temp.act_as(:'player_id');
update public.issues set name = 'Hijacked' where id = :'issue_id'::uuid;

select pg_temp.act_as_postgres();
select is(
  (select name from public.issues where id = :'issue_id'::uuid),
  'Sprint 24 refinement',
  'a participant''s edit matches no rows — the name is unchanged'
);


-- ---------------------------------------------------------------------------
-- The summary is optional, and blank is not a way to say "none"
-- ---------------------------------------------------------------------------
select pg_temp.act_as(:'owner_id');

select is(
  (select summary from public.issues where id = :'issue_id'::uuid),
  null,
  'an issue created without a summary has none'
);

select pg_temp.act_as(:'owner_id');
update public.issues set summary = 'Added after the fact.'
 where id = :'editable_id'::uuid;

select is(
  (select summary from public.issues where id = :'editable_id'::uuid),
  'Added after the fact.',
  'a summary can be added to an existing open issue'
);

select throws_ok(
  $$ insert into public.issues (name, deck_name, deck_values, summary)
     values ('Blank summary', 'Fib', array['1','2'], '   ') $$,
  23514, null,
  'a whitespace-only summary is rejected — null is the only way to say "none"'
);

select throws_ok(
  format($$ insert into public.issues (name, deck_name, deck_values, summary)
            values ('Too long', 'Fib', array['1','2'], %L) $$,
         repeat('x', 501)),
  23514, null,
  'a summary over 500 characters is rejected'
);

select lives_ok(
  $$ insert into public.issues (name, deck_name, deck_values, summary)
     values ('With summary', 'Fib', array['1','2'],
             'Add SSO for enterprise workspaces.') $$,
  'an issue can be created with a summary'
);


-- ---------------------------------------------------------------------------
-- The clock is started deliberately, not by creating the issue
-- ---------------------------------------------------------------------------
select pg_temp.act_as(:'owner_id');

insert into public.issues (name, deck_name, deck_values, round_duration_seconds)
values ('Timed issue', 'Fibonacci', array['1','2','3'], 60);

select id as timed_id from public.issues where name = 'Timed issue'
\gset

select is(
  (select round_ends_at from public.issues where id = :'timed_id'::uuid),
  null,
  'creating a timed issue does not start its clock'
);

select throws_ok(
  format($$ select public.start_round(%L) $$, :'issue_id'),
  'P0001', null,
  'an issue with no timebox has no clock to start'
);

select pg_temp.act_as(:'player_id');
select throws_ok(
  format($$ select public.start_round(%L) $$, :'timed_id'),
  42501, null,
  'only the owner can start the clock'
);

select pg_temp.act_as(:'owner_id');
select public.start_round(:'timed_id');

select isnt(
  (select round_ends_at from public.issues where id = :'timed_id'::uuid),
  null,
  'start_round sets the deadline'
);

-- A second press must not quietly buy the round more time.
select public.start_round(:'timed_id');

select is(
  (select round_ends_at from public.issues where id = :'timed_id'::uuid),
  (select round_started_at + make_interval(secs => round_duration_seconds)
     from public.issues where id = :'timed_id'::uuid),
  'starting an already-running clock leaves the deadline where it was'
);


-- ---------------------------------------------------------------------------
-- Your list order is yours
--
-- The whole reason issue_order is keyed on the user and written through an RPC
-- rather than being a column on `issues`: the list you drag includes issues
-- you only have a seat at, so ordering has to be a private preference that
-- nobody else's drag can move.
-- ---------------------------------------------------------------------------
select pg_temp.act_as(:'owner_id');

select throws_ok(
  format($$ insert into public.issue_order (user_id, issue_id, sort_order)
            values (%L, %L, 1) $$, :'owner_id', :'timed_id'),
  42501, null,
  'a client cannot write issue_order directly — reorder_issues() is the only door'
);

select public.reorder_issues(array[:'timed_id', :'editable_id']::uuid[]);

select results_eq(
  format($$ select issue_id, sort_order from public.issue_order
             where user_id = %L order by sort_order $$, :'owner_id'),
  format($$ values (%L::uuid, 1), (%L::uuid, 2) $$, :'timed_id', :'editable_id'),
  'reorder_issues stores the order that was sent, numbered from 1'
);

-- Replaces rather than merges: issues left out of the call stop being ranked,
-- which is what keeps a deleted issue from holding a slot forever.
select public.reorder_issues(array[:'editable_id']::uuid[]);

select results_eq(
  format($$ select issue_id, sort_order from public.issue_order
             where user_id = %L order by sort_order $$, :'owner_id'),
  format($$ values (%L::uuid, 1) $$, :'editable_id'),
  'a second reorder replaces the whole order rather than adding to it'
);

-- A stale tab can hold an id that is gone, or one it never had any business
-- naming. Those are dropped and the rest of the order still saves — and the
-- numbering closes up behind them rather than leaving a gap.
select public.reorder_issues(
  array[:'editable_id', gen_random_uuid(), :'timed_id']::uuid[]
);

select results_eq(
  format($$ select issue_id, sort_order from public.issue_order
             where user_id = %L order by sort_order $$, :'owner_id'),
  format($$ values (%L::uuid, 1), (%L::uuid, 2) $$, :'editable_id', :'timed_id'),
  'an issue the caller cannot see is dropped, and the rest renumber contiguously'
);

-- The player has a seat at `editable_id` but does not own it, so they may rank
-- it — and doing so must not touch the owner's order.
select pg_temp.act_as(:'player_id');
select public.reorder_issues(array[:'editable_id']::uuid[]);

select is(
  (select count(*)::int from public.issue_order),
  1,
  'each person reads only their own order (RLS), not everybody''s'
);

select pg_temp.act_as(:'owner_id');
select is(
  (select count(*)::int from public.issue_order),
  2,
  'a participant reordering their own list leaves the owner''s order alone'
);


-- ---------------------------------------------------------------------------
-- An issue with votes can still be deleted
--
-- Deleting an issue cascades to its votes, which fires the BEFORE DELETE guard
-- while the parent row is already gone. Without a branch for that, deleting
-- any issue that had ever been voted in would fail — and so would deleting a
-- user, which cascades to the issues they own.
-- ---------------------------------------------------------------------------
-- A participant deleting is not an error, it simply matches no rows — which
-- is why the action checks the returned count rather than trusting a silent
-- success.
select pg_temp.act_as(:'player_id');
delete from public.issues where id = :'issue_id'::uuid;

select pg_temp.act_as_postgres();
select isnt_empty(
  format($$ select 1 from public.issues where id = %L $$, :'issue_id'),
  'a participant''s delete matches no rows — the issue survives'
);

select pg_temp.act_as(:'owner_id');
select lives_ok(
  format($$ delete from public.issues where id = %L $$, :'issue_id'),
  'an issue that has votes can be deleted (cascade reaches the vote guard)'
);

select pg_temp.act_as_postgres();
select is(
  (select count(*)::int from public.votes where issue_id = :'issue_id'::uuid),
  0,
  'deleting an issue takes its cards with it'
);

-- Ranked by both of them, so this covers the cascade for a row that is not
-- the deleting user's.
select pg_temp.act_as(:'owner_id');
delete from public.issues where id = :'editable_id'::uuid;

select pg_temp.act_as_postgres();
select is(
  (select count(*)::int from public.issue_order
    where issue_id = :'editable_id'::uuid),
  0,
  'deleting an issue takes everyone''s ordering of it with it'
);


-- ---------------------------------------------------------------------------
-- The realtime topic guard must not raise on junk input
-- ---------------------------------------------------------------------------
select pg_temp.act_as(:'player_id');

select is(
  private.can_use_issue_topic('issue:not-a-uuid'),
  false,
  'a malformed channel topic returns false rather than raising 22P02'
);

select is(
  private.can_use_issue_topic('issue:' || :'issue_id'),
  false,
  'someone who has left may not subscribe to that issue''s channel'
);

-- The prefix is part of the contract: the client subscribes to `issue:<uuid>`,
-- so a topic still spelled the old way must not authorise.
select is(
  private.can_use_issue_topic('game:' || :'issue_id'),
  false,
  'the old game: topic prefix no longer authorises anything'
);

select * from finish();

rollback;
