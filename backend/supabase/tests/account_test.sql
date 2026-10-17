-- Profiles and the two account-lifecycle routines behind the settings page.
-- Run with `pnpm db test:db`.
--
-- Every failure here is silent. A widened grant on `profiles` lets anyone hand
-- themselves a paid tier; a routine that deletes the wrong row takes someone
-- else's account, and the caller sees only "done".

begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

-- ---------------------------------------------------------------------------
-- Fixtures. Two permanent users, each owning an issue and seated at the
-- other's, so a delete can be checked for what it takes and what it leaves.
-- ---------------------------------------------------------------------------
\set ama_id  '11111111-aaaa-0000-0000-000000000001'
\set kojo_id '22222222-aaaa-0000-0000-000000000002'

insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000', :'ama_id',  'authenticated', 'authenticated', 'ama@poko.test',  '{"full_name":"Ama Kyei"}'),
  ('00000000-0000-0000-0000-000000000000', :'kojo_id', 'authenticated', 'authenticated', 'kojo@poko.test', '{"full_name":"Kojo Mensah"}');

insert into public.issues (owner_id, name, deck_name, deck_values)
values
  (:'ama_id'::uuid,  'Ama''s issue',  'Fibonacci', array['1','2','3','5','8']),
  (:'kojo_id'::uuid, 'Kojo''s issue', 'Fibonacci', array['1','2','3','5','8']);

select id as ama_issue  from public.issues where name = 'Ama''s issue'  \gset
select id as kojo_issue from public.issues where name = 'Kojo''s issue' \gset

-- Owners are seated by trigger; seat each at the other's issue too.
insert into public.issue_participants (issue_id, user_id, display_name)
values
  (:'ama_issue'::uuid,  :'kojo_id'::uuid, 'Kojo Mensah'),
  (:'kojo_issue'::uuid, :'ama_id'::uuid,  'Ama Kyei')
on conflict do nothing;

-- A live session for each, so deactivation can be seen to revoke only one.
insert into auth.sessions (id, user_id)
values (gen_random_uuid(), :'ama_id'::uuid),
       (gen_random_uuid(), :'kojo_id'::uuid);

create or replace function pg_temp.act_as(p_uid uuid)
returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid::text, 'role', 'authenticated')::text, true);
end; $$;

create or replace function pg_temp.act_as_postgres() returns void
language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end; $$;


-- ---------------------------------------------------------------------------
-- The grant boundary. `tier` is only trustworthy while no client can write it.
-- ---------------------------------------------------------------------------
select ok(
  not has_table_privilege('authenticated', 'public.profiles', 'insert,update,delete'),
  'authenticated holds no write privilege on profiles'
);

select ok(
  not has_table_privilege('anon', 'public.profiles', 'select,insert,update,delete'),
  'anon holds no privilege on profiles at all'
);

select ok(
  not has_function_privilege('anon', 'public.delete_own_account()', 'execute'),
  'anon cannot execute delete_own_account'
);

select ok(
  not has_function_privilege('anon', 'public.deactivate_own_account()', 'execute'),
  'anon cannot execute deactivate_own_account'
);


-- ---------------------------------------------------------------------------
-- Profiles.
-- ---------------------------------------------------------------------------
select set_eq(
  format($$ select id, tier from public.profiles where id in (%L, %L) $$,
         :'ama_id', :'kojo_id'),
  format($$ values (%L::uuid, 'free'), (%L::uuid, 'free') $$,
         :'ama_id', :'kojo_id'),
  'every new account gets a profile, on the free tier'
);

select pg_temp.act_as(:'ama_id');

select results_eq(
  $$ select id from public.profiles $$,
  format($$ values (%L::uuid) $$, :'ama_id'),
  'a user sees their own profile and nobody else''s'
);

select throws_ok(
  format($$ update public.profiles set tier = 'pro' where id = %L $$, :'ama_id'),
  42501, null,
  'a user cannot promote their own tier'
);

select throws_ok(
  format($$ insert into public.profiles (id, tier) values (%L, 'pro') $$,
         gen_random_uuid()),
  42501, null,
  'a user cannot insert a profile'
);

select throws_ok(
  format($$ delete from public.profiles where id = %L $$, :'ama_id'),
  42501, null,
  'a user cannot delete a profile'
);


-- ---------------------------------------------------------------------------
-- Deactivating. Closes the door to the caller and nobody else.
-- ---------------------------------------------------------------------------
select lives_ok(
  $$ select public.deactivate_own_account() $$,
  'a signed-in user can deactivate their own account'
);

select pg_temp.act_as_postgres();

select ok(
  (select banned_until > now() + interval '99 years'
     from auth.users where id = :'ama_id'),
  'deactivating bans the caller from signing in'
);

select is_empty(
  format($$ select 1 from auth.sessions where user_id = %L $$, :'ama_id'),
  'deactivating ends the caller''s existing sessions'
);

select is(
  (select banned_until from auth.users where id = :'kojo_id'),
  null,
  'deactivating leaves every other account unbanned'
);

select isnt_empty(
  format($$ select 1 from auth.sessions where user_id = %L $$, :'kojo_id'),
  'deactivating leaves every other account''s sessions alone'
);

select isnt_empty(
  format($$ select 1 from public.issues where id = %L $$, :'ama_issue'),
  'deactivating keeps the caller''s data — the door closes, nothing is deleted'
);


-- ---------------------------------------------------------------------------
-- Deleting. The routine takes no argument, so it can only ever point at the
-- caller — and with no caller it must refuse rather than match nothing.
-- ---------------------------------------------------------------------------
select pg_temp.act_as_postgres();
select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);

select throws_ok(
  $$ select public.delete_own_account() $$,
  '28000', null,
  'delete_own_account refuses a request with no user behind it'
);

select pg_temp.act_as(:'kojo_id');

select lives_ok(
  $$ select public.delete_own_account() $$,
  'a signed-in user can delete their own account'
);

select pg_temp.act_as_postgres();

select is_empty(
  format($$ select 1 from auth.users where id = %L $$, :'kojo_id'),
  'deleting removes the caller''s account'
);

select is_empty(
  format($$ select 1 from public.profiles where id = %L $$, :'kojo_id'),
  'deleting takes the caller''s profile with it'
);

select is_empty(
  format($$ select 1 from public.issues where id = %L $$, :'kojo_issue'),
  'deleting takes the issues the caller owned'
);

select is_empty(
  format($$ select 1 from public.issue_participants where user_id = %L $$,
         :'kojo_id'),
  'deleting takes the caller''s seats at other people''s issues'
);

select isnt_empty(
  format($$ select 1 from public.issues where id = %L $$, :'ama_issue'),
  'deleting leaves other people''s issues standing, even ones the caller sat at'
);

select * from finish();

rollback;
