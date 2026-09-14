-- Somewhere to keep what a person's plan is, plus the two account-lifecycle
-- actions the settings page needs.
--
-- The plan could not live in `user_metadata`: that is editable by the user it
-- belongs to, so anyone could hand themselves a paid tier. It needs a table
-- the client can read and cannot write.

-- ---------------------------------------------------------------------------
-- 1. profiles
--
-- One row per account, holding only what `auth.users` has no place for. The
-- display name deliberately stays in user_metadata, where it already lives and
-- where being user-editable is correct — it is a label, never a permission.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  tier       text not null default 'free',
  created_at timestamptz not null default now(),

  constraint profiles_tier_valid check (tier in ('free', 'pro'))
);

alter table public.profiles enable row level security;

create policy profiles_select_own on public.profiles
for select to authenticated
using ( id = (select auth.uid()) );

-- Read-only to the client, on purpose.
--
-- There is deliberately NO insert, update or delete grant: without them `tier`
-- cannot be self-assigned, which is the whole reason this table exists rather
-- than a metadata field. A billing webhook running as the service role is what
-- would write it — nothing in the app can.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Every account gets a profile, including the ones already here.
-- ---------------------------------------------------------------------------
create or replace function private.poko_users_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;

  return null;
end;
$$;

create trigger users_after_insert
after insert on auth.users
for each row execute function private.poko_users_after_insert();

insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 3. Deactivating an account.
--
-- `banned_until` is the switch GoTrue itself checks when someone tries to sign
-- in, so this is a real deactivation rather than a flag the app has to
-- remember to honour. Reversing it needs an administrator, which is the
-- distinction from deleting: the data stays, the door closes.
-- ---------------------------------------------------------------------------
create or replace function public.deactivate_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'poko: sign in first'
      using errcode = '28000', hint = 'poko_not_signed_in';
  end if;

  -- Far future rather than 'infinity': some tooling round-trips these
  -- timestamps through types that can't represent it.
  update auth.users
     set banned_until = now() + interval '100 years'
   where id = v_uid;

  -- Existing tokens stay valid until they expire, so the client must sign out
  -- as well — this only stops the next sign-in.
  delete from auth.sessions where user_id = v_uid;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Deleting an account.
--
-- Done in SQL rather than through auth.admin so the app never needs a
-- service-role key in reach of a request. Cascades from auth.users take the
-- profile, the seats, the votes and every game owned with them.
-- ---------------------------------------------------------------------------
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'poko: sign in first'
      using errcode = '28000', hint = 'poko_not_signed_in';
  end if;

  -- Only ever the caller's own row. There is no argument to this function, so
  -- there is nothing to point at anybody else.
  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.deactivate_own_account() from public, anon;
revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.deactivate_own_account() to authenticated;
grant execute on function public.delete_own_account() to authenticated;
