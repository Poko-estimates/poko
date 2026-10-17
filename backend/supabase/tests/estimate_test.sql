-- Recording an estimate after a split vote, through set_estimate().
-- Run with `pnpm db test:db`.
--
-- The room's picker only offers the owner deck cards on a closed round, but
-- the routine is the boundary: a player calling it directly must still be
-- refused, and a guard that stops guarding fails no other test.

begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

\set owner_id  '11111111-eeee-0000-0000-000000000001'
\set player_id '22222222-eeee-0000-0000-000000000002'

insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000', :'owner_id',  'authenticated', 'authenticated', 'owner@poko.test',  '{"full_name":"Ama Owner"}'),
  ('00000000-0000-0000-0000-000000000000', :'player_id', 'authenticated', 'authenticated', 'player@poko.test', '{"full_name":"Kojo Player"}');

create or replace function pg_temp.act_as(p_uid uuid)
returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid::text, 'role', 'authenticated')::text, true);
end; $$;

select pg_temp.act_as(:'owner_id');

insert into public.issues (name, deck_name, deck_values)
values ('Split vote', 'Fibonacci', array['1','2','3','5','8','?']);

select id as issue_id, slug as issue_slug from public.issues
 where name = 'Split vote' \gset

select pg_temp.act_as(:'player_id');
select public.join_issue(:'issue_slug', 'Kojo');


-- ---------------------------------------------------------------------------
-- While the round is open there is nothing to settle yet.
-- ---------------------------------------------------------------------------
select pg_temp.act_as(:'owner_id');

select throws_ok(
  format($$ select public.set_estimate(%L, '5') $$, :'issue_id'),
  'P0001', null,
  'the owner cannot record an estimate while voting is open'
);


-- ---------------------------------------------------------------------------
-- A 3 and an 8: the last card closes the round, with no estimate.
-- ---------------------------------------------------------------------------
insert into public.votes (issue_id, round, value) values (:'issue_id', 1, '3');

select pg_temp.act_as(:'player_id');
insert into public.votes (issue_id, round, value) values (:'issue_id', 1, '8');

select results_eq(
  format($$ select status, estimate from public.issues where id = %L $$,
         :'issue_id'),
  $$ values ('closed'::text, null::text) $$,
  'a split vote closes the round without recording an estimate'
);

select throws_ok(
  format($$ select public.set_estimate(%L, '5') $$, :'issue_id'),
  42501, null,
  'a player cannot record the estimate — only the owner settles a split'
);


-- ---------------------------------------------------------------------------
-- The owner settles it, on a card from the deck.
-- ---------------------------------------------------------------------------
select pg_temp.act_as(:'owner_id');

select throws_ok(
  format($$ select public.set_estimate(%L, '4') $$, :'issue_id'),
  23514, null,
  'an agreed estimate must be a card in the deck, not an average between two'
);

select lives_ok(
  format($$ select public.set_estimate(%L, '5') $$, :'issue_id'),
  'the owner can record the card the team agreed on'
);

select is(
  (select estimate from public.issues where id = :'issue_id'),
  '5',
  'the agreed card is saved as the estimate'
);

select lives_ok(
  format($$ select public.set_estimate(%L, '3') $$, :'issue_id'),
  'the owner can change a recorded estimate while the round stays closed'
);

select pg_temp.act_as(:'player_id');

select is(
  (select estimate from public.issues where id = :'issue_id'),
  '3',
  'everyone at the table sees the recorded estimate'
);


-- ---------------------------------------------------------------------------
-- Reopening voting starts over, so a stale agreement can't outlive it.
-- ---------------------------------------------------------------------------
select pg_temp.act_as(:'owner_id');
select public.reopen_round(:'issue_id');

select is(
  (select estimate from public.issues where id = :'issue_id'),
  null,
  'reopening voting clears the recorded estimate'
);

select * from finish();

rollback;
