-- Blind voting, round lifecycle, and the grant boundary.
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
--     game, then passed around as literals. Not a convenience: someone who has
--     not joined cannot read the game row at all, so they could never look the
--     slug up. They know it because it was in the link they were sent — which
--     is exactly why join_game() has to be security definer.
--   * With two seats, the second vote AUTO-CLOSES the round. So anything that
--     needs an open round has to happen while only one seat has voted.

begin;

create extension if not exists pgtap with schema extensions;

select plan(34);

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
-- Creating a game
-- ---------------------------------------------------------------------------
select pg_temp.act_as(:'owner_id');

insert into public.games (name, deck_name, deck_values)
values ('Sprint 24 refinement', 'Fibonacci',
        array['0','1','2','3','5','8','13','21','?','☕']);

select isnt_empty(
  $$ select 1 from public.games where name = 'Sprint 24 refinement' $$,
  'owner can create a game and read it back'
);

select matches(
  (select slug from public.games where name = 'Sprint 24 refinement'),
  '^sprint-24-refinement-[0-9a-f]{12}$',
  'slug is the name prefix plus 12 hex characters of entropy'
);

select id as game_id, slug as game_slug
  from public.games where name = 'Sprint 24 refinement'
\gset

-- Deck validation is enforced by the database, not only by the create dialog.
select throws_ok(
  $$ insert into public.games (name, deck_name, deck_values)
     values ('One card', 'Silly', array['1']) $$,
  23514, null,
  'a deck with fewer than 2 values is rejected'
);

select throws_ok(
  $$ insert into public.games (name, deck_name, deck_values)
     values ('Dupes', 'Silly', array['1','1','2']) $$,
  23514, null,
  'a deck with duplicate values is rejected'
);


-- ---------------------------------------------------------------------------
-- Guests may join and vote, but never own
-- ---------------------------------------------------------------------------
select pg_temp.act_as(:'guest_id', true);

select throws_ok(
  $$ insert into public.games (name, deck_name, deck_values)
     values ('Guest game', 'Fibonacci', array['1','2','3']) $$,
  42501, null,
  'an anonymous user cannot own a game (restrictive policy)'
);


-- ---------------------------------------------------------------------------
-- Joining is only possible through join_game()
-- ---------------------------------------------------------------------------
select pg_temp.act_as(:'player_id');

select throws_ok(
  format($$ insert into public.game_participants (game_id, user_id, display_name)
            values (%L, %L, 'Sneaky') $$, :'game_id', :'player_id'),
  42501, null,
  'a client cannot insert a seat directly — join_game() is the only door'
);

select throws_ok(
  $$ select public.join_game('no-such-room-abcdef123456') $$,
  'P0002', null,
  'joining an unknown slug raises rather than silently doing nothing'
);

select pg_temp.act_as(:'owner_id');
select public.join_game(:'game_slug', 'Ama');

select pg_temp.act_as(:'player_id');
select public.join_game(:'game_slug', 'Kojo');

select lives_ok(
  format($$ select public.join_game(%L, 'Kojo K.') $$, :'game_slug'),
  'join_game is idempotent — re-opening the link is safe'
);

select is(
  (select count(*)::int from public.game_participants),
  2,
  'the idempotent re-join did not create a second seat'
);


-- ---------------------------------------------------------------------------
-- A non-participant sees nothing at all
-- ---------------------------------------------------------------------------
select pg_temp.act_as(:'outsider_id');

select is_empty(
  $$ select 1 from public.games $$,
  'someone who was never invited cannot see the game'
);

select is_empty(
  $$ select 1 from public.game_participants $$,
  'someone who was never invited cannot see the roster'
);


-- ---------------------------------------------------------------------------
-- ROUND 1 — the central test: blind voting, then a split vote
-- ---------------------------------------------------------------------------
select pg_temp.act_as(:'owner_id');
insert into public.votes (game_id, round, value) values (:'game_id', 1, '5');

select pg_temp.act_as(:'player_id');

select is(
  (select count(*)::int from public.votes),
  0,
  'BLIND: mid-round, a participant cannot see another participant''s vote'
);

select is(
  (select count(*)::int from public.game_participants where voted_round is not null),
  1,
  'progress is visible: the roster shows who has a card down'
);

select throws_ok(
  format($$ insert into public.votes (game_id, round, value)
            values (%L, 1, '999') $$, :'game_id'),
  'P0001', null,
  'a value outside the deck is rejected by the guard trigger'
);

-- The owner changes their own card while the round is still open. If the votes
-- SELECT policy ever loses its `user_id = auth.uid()` branch, this silently
-- affects 0 rows with no error raised anywhere.
select pg_temp.act_as(:'owner_id');
update public.votes set value = '8' where game_id = :'game_id';

select is(
  (select value from public.votes where user_id = :'owner_id'::uuid),
  '8',
  'changing your own card works (UPDATE needs a matching SELECT policy)'
);

select pg_temp.act_as_postgres();
select is(
  (select status from public.games where id = :'game_id'::uuid),
  'voting',
  'one of two seats voting leaves the round open'
);

-- The second card lands: 8 vs 3, so the round closes without consensus.
select pg_temp.act_as(:'player_id');
insert into public.votes (game_id, round, value) values (:'game_id', 1, '3');

select pg_temp.act_as_postgres();

select is(
  (select status from public.games where id = :'game_id'::uuid),
  'closed',
  'the round auto-closed once every seat had a card down'
);

select is(
  (select closed_reason from public.games where id = :'game_id'::uuid),
  'all_voted',
  'closed_reason records how the round ended'
);

select is(
  (select estimate from public.games where id = :'game_id'::uuid),
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
  format($$ update public.votes set value = '13' where game_id = %L $$, :'game_id'),
  'P0001', null,
  'no vote can be cast or changed after the round closes'
);

-- Blind voting's real guarantee: a participant cannot move the round at all.
-- This fails on the missing column grant, before RLS is even consulted.
select throws_ok(
  $$ update public.games set status = 'closed' $$,
  42501, null,
  'a participant cannot write status — no column grant exists'
);

select throws_ok(
  format($$ select public.reopen_round(%L) $$, :'game_id'),
  42501, null,
  'only the owner can reopen a round'
);


-- ---------------------------------------------------------------------------
-- ROUND 2 — reopening keeps history, and a unanimous vote records an estimate
-- ---------------------------------------------------------------------------
select pg_temp.act_as(:'owner_id');
select public.reopen_round(:'game_id');

select pg_temp.act_as_postgres();

select is(
  (select round from public.games where id = :'game_id'::uuid),
  2,
  'reopening advanced the round counter rather than deleting votes'
);

select is(
  (select count(*)::int from public.game_participants where voted_round = 2),
  0,
  'reopening cleared every seat with one write'
);

select is(
  (select count(*)::int from public.votes where round = 1),
  2,
  'the previous round''s cards survive a reopen and stay readable'
);

select pg_temp.act_as(:'owner_id');
insert into public.votes (game_id, round, value) values (:'game_id', 2, '3');
select pg_temp.act_as(:'player_id');
insert into public.votes (game_id, round, value) values (:'game_id', 2, '3');

select pg_temp.act_as_postgres();
select is(
  (select estimate from public.games where id = :'game_id'::uuid),
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
select public.join_game(:'game_slug', 'Guest');

select is(
  (select count(*)::int from public.game_participants),
  3,
  'an anonymous guest can take a seat at the table'
);

select pg_temp.act_as(:'owner_id');
select public.reopen_round(:'game_id');
insert into public.votes (game_id, round, value) values (:'game_id', 3, '5');

-- A guest votes like anyone else.
select pg_temp.act_as(:'guest_id', true);
insert into public.votes (game_id, round, value) values (:'game_id', 3, '5');

select pg_temp.act_as_postgres();
select is(
  (select status from public.games where id = :'game_id'::uuid),
  'voting',
  'round 3 is open with two of three cards down'
);

-- The last holdout walks out without voting. The room must not hang forever
-- waiting for someone who left.
select pg_temp.act_as(:'player_id');
delete from public.game_participants where user_id = :'player_id'::uuid;

select pg_temp.act_as_postgres();
select is(
  (select status from public.games where id = :'game_id'::uuid),
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
  format($$ delete from public.game_participants
             where game_id = %L and user_id = %L $$, :'game_id', :'owner_id'),
  'leaving the table after a reveal succeeds (cascade-delete guard)'
);


-- ---------------------------------------------------------------------------
-- The realtime topic guard must not raise on junk input
-- ---------------------------------------------------------------------------
select pg_temp.act_as(:'player_id');

select is(
  private.can_use_game_topic('game:not-a-uuid'),
  false,
  'a malformed channel topic returns false rather than raising 22P02'
);

select is(
  private.can_use_game_topic('game:' || :'game_id'),
  false,
  'someone who has left may not subscribe to that game''s channel'
);

select * from finish();

rollback;
