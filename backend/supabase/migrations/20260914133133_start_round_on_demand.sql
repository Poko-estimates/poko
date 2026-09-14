-- The clock no longer starts itself.
--
-- A game was created with `round_ends_at` already set, so the countdown began
-- the instant the create dialog closed — before anyone had read the story, let
-- alone followed the invite link. The timebox is now a setting that someone
-- starts deliberately: `round_duration_seconds` is the length, and
-- `round_ends_at` stays null until `start_round` is called.
--
-- Everything downstream already handles a null deadline correctly, which is
-- what makes this a small change: `poko_votes_guard` skips its expiry check,
-- and `close_round` reads "not expired" and so stays owner-only.

-- ---------------------------------------------------------------------------
-- 1. A duration may now exist without a deadline.
--
-- The old constraint insisted the two travelled together, which is exactly the
-- coupling being removed. A deadline still requires a duration, though —
-- otherwise there would be no length to have derived it from.
-- ---------------------------------------------------------------------------
alter table public.games
  drop constraint games_ends_at_requires_duration;

alter table public.games
  add constraint games_ends_at_requires_duration
  check (round_ends_at is null or round_duration_seconds is not null);

-- ---------------------------------------------------------------------------
-- 2. Creating a game no longer starts its clock.
-- ---------------------------------------------------------------------------
create or replace function private.poko_games_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt integer := 0;
begin
  -- Always regenerated from the name, whatever the column default or the
  -- caller supplied: the slug is a capability token, so the client must never
  -- get to choose it.
  loop
    v_attempt := v_attempt + 1;
    new.slug := private.poko_slug(new.name);
    exit when not exists (select 1 from public.games g where g.slug = new.slug);
    if v_attempt >= 5 then
      raise exception 'poko: could not allocate a unique slug'
        using errcode = 'P0001', hint = 'poko_slug_exhausted';
    end if;
  end loop;

  new.round_started_at := now();
  -- Left null on purpose. start_round() sets it.
  new.round_ends_at := null;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Starting the clock.
--
-- Owner only, matching reopen_round: setting the pace is a facilitation act,
-- and a participant who could start the clock could also start it on a room
-- that isn't ready.
-- ---------------------------------------------------------------------------
create or replace function public.start_round(p_game_id uuid)
returns public.games
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_game public.games;
  v_uid  uuid := (select auth.uid());
begin
  select * into v_game from public.games where id = p_game_id for update;

  if not found or v_game.owner_id <> v_uid then
    raise exception 'poko: only the owner can start the clock'
      using errcode = '42501', hint = 'poko_not_owner';
  end if;

  if v_game.status <> 'voting' then
    raise exception 'poko: round % is closed', v_game.round
      using errcode = 'P0001', hint = 'poko_round_closed';
  end if;

  if v_game.round_duration_seconds is null then
    raise exception 'poko: this game has no timebox to start'
      using errcode = 'P0001', hint = 'poko_no_timebox';
  end if;

  -- Already running. Returning quietly rather than raising makes a double
  -- click harmless, and refusing to re-derive the deadline means the clock
  -- cannot be quietly restarted to hand out more time.
  if v_game.round_ends_at is not null then
    return v_game;
  end if;

  update public.games
     set round_started_at = now(),
         round_ends_at    = now() + make_interval(secs => v_game.round_duration_seconds),
         updated_at       = now()
   where id = p_game_id
   returning * into v_game;

  -- game_updated rather than a new event name: every client needs to re-read
  -- and pick up the deadline, but a clock starting is not a moment to announce.
  perform private.poko_broadcast(p_game_id, 'game_updated', jsonb_build_object(
    'round', v_game.round,
    'round_ends_at', v_game.round_ends_at,
    'server_now', now()
  ));

  return v_game;
end;
$$;

revoke all on function public.start_round(uuid) from public, anon;
grant execute on function public.start_round(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Reopening leaves the clock stopped too.
--
-- Otherwise the second round would behave like the first used to: running
-- before anyone had noticed it had restarted. Only the round_ends_at
-- assignment differs from the original.
-- ---------------------------------------------------------------------------
create or replace function public.reopen_round(p_game_id uuid)
returns public.games
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_game public.games;
  v_uid  uuid := (select auth.uid());
begin
  select * into v_game from public.games where id = p_game_id for update;

  if not found or v_game.owner_id <> v_uid then
    raise exception 'poko: only the owner can reopen a round'
      using errcode = '42501', hint = 'poko_not_owner';
  end if;

  if v_game.status <> 'closed' then
    return v_game;  -- already open
  end if;

  update public.games
     set round            = round + 1,
         status           = 'voting',
         estimate         = null,
         closed_at        = null,
         closed_reason    = null,
         round_started_at = now(),
         round_ends_at    = null,
         updated_at       = now()
   where id = p_game_id
   returning * into v_game;

  perform private.poko_broadcast(p_game_id, 'round_reopened', jsonb_build_object(
    'round',         v_game.round,
    'round_ends_at', v_game.round_ends_at,
    'server_now',    now()
  ));

  return v_game;
end;
$$;
