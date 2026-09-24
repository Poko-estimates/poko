-- Pause, resume, stop and reset for the round's clock.
--
-- A running countdown was previously a one-way trip: it started and it
-- expired. Real refinement does not work like that — someone asks a question,
-- a call drops, the story turns out to need splitting — so the facilitator
-- needs to hold the clock without ending the round.
--
-- ---------------------------------------------------------------------------
-- HOW PAUSING IS REPRESENTED
--
-- `round_ends_at` stays the authority and is never recalculated on pause. What
-- is recorded instead is the INSTANT of the pause, in `round_paused_at`, and
-- resuming pushes the deadline forward by however long the pause lasted:
--
--     round_ends_at := round_ends_at + (now() - round_paused_at)
--
-- Storing a "remaining seconds" instead would have meant two sources of truth
-- for the same fact, and a rounding error every time the clock changed hands.
-- This way the remaining time is derived, always, from the two timestamps.
--
-- The consequence worth spelling out: while `round_paused_at` is set,
-- `round_ends_at` is in the past or drifting into it, and anything that reads
-- "has the deadline passed?" must ask "and is it not paused?" first. Two
-- places do: the vote guard, which would otherwise refuse votes during a
-- pause, and close_round, which would otherwise let any participant close the
-- round on the strength of an expiry that is not real. Both are rebuilt below,
-- and both have a pgTAP assertion.
--
-- STOP versus RESET versus CLOSE. Three different things, and only the last
-- one ends the voting:
--
--   stop_round   drops the clock, leaves the round open and untimed
--   reset_round  restarts the same length from now
--   close_round  ends the round (unchanged, and still its own control)


-- ---------------------------------------------------------------------------
-- 1. The pause instant.
-- ---------------------------------------------------------------------------
alter table public.issues
  add column round_paused_at timestamptz;

-- A pause is a pause OF something. Without this, a stopped round could carry a
-- pause instant and the resume arithmetic would have nothing to add to.
alter table public.issues
  add constraint issues_paused_requires_deadline
  check (round_paused_at is null or round_ends_at is not null);

-- Deliberately in no grant, exactly like round_ends_at and
-- round_duration_seconds: the clock moves only through the routines below.


-- ---------------------------------------------------------------------------
-- 2. Holding the clock.
--
-- Owner only, matching start_round and reopen_round: setting the pace is a
-- facilitation act.
-- ---------------------------------------------------------------------------
create function public.pause_round(p_issue_id uuid)
returns public.issues
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_issue public.issues;
  v_uid   uuid := (select auth.uid());
begin
  select * into v_issue from public.issues where id = p_issue_id for update;

  if not found or v_issue.owner_id <> v_uid then
    raise exception 'poko: only the owner can pause the clock'
      using errcode = '42501', hint = 'poko_not_owner';
  end if;

  if v_issue.status <> 'voting' then
    raise exception 'poko: round % is closed', v_issue.round
      using errcode = 'P0001', hint = 'poko_round_closed';
  end if;

  if v_issue.round_ends_at is null then
    raise exception 'poko: there is no clock running to pause'
      using errcode = 'P0001', hint = 'poko_clock_stopped';
  end if;

  -- Already paused. Quiet rather than raising, so a double click is harmless —
  -- and re-stamping would silently extend the round by the gap.
  if v_issue.round_paused_at is not null then
    return v_issue;
  end if;

  -- Pausing a round whose time is already gone would resurrect it: the resume
  -- below adds the pause length to a deadline that has passed, handing out
  -- time that the timer already took away.
  if now() >= v_issue.round_ends_at then
    raise exception 'poko: that round is already out of time'
      using errcode = 'P0001', hint = 'poko_round_expired';
  end if;

  update public.issues
     set round_paused_at = now(),
         updated_at      = now()
   where id = p_issue_id
   returning * into v_issue;

  perform private.poko_broadcast(p_issue_id, 'issue_updated', jsonb_build_object(
    'round',           v_issue.round,
    'round_ends_at',   v_issue.round_ends_at,
    'round_paused_at', v_issue.round_paused_at,
    'server_now',      now()
  ));

  return v_issue;
end;
$$;

create function public.resume_round(p_issue_id uuid)
returns public.issues
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_issue public.issues;
  v_uid   uuid := (select auth.uid());
begin
  select * into v_issue from public.issues where id = p_issue_id for update;

  if not found or v_issue.owner_id <> v_uid then
    raise exception 'poko: only the owner can resume the clock'
      using errcode = '42501', hint = 'poko_not_owner';
  end if;

  if v_issue.status <> 'voting' then
    raise exception 'poko: round % is closed', v_issue.round
      using errcode = 'P0001', hint = 'poko_round_closed';
  end if;

  -- Not paused: nothing to resume, and no arithmetic that would make sense.
  if v_issue.round_paused_at is null then
    return v_issue;
  end if;

  -- The whole point of storing the instant rather than the remainder: the
  -- deadline moves by exactly as long as the pause lasted, so the round gets
  -- back the time it had and not a second more.
  update public.issues
     set round_ends_at   = v_issue.round_ends_at
                           + (now() - v_issue.round_paused_at),
         round_paused_at = null,
         updated_at      = now()
   where id = p_issue_id
   returning * into v_issue;

  perform private.poko_broadcast(p_issue_id, 'issue_updated', jsonb_build_object(
    'round',           v_issue.round,
    'round_ends_at',   v_issue.round_ends_at,
    'round_paused_at', null,
    'server_now',      now()
  ));

  return v_issue;
end;
$$;


-- ---------------------------------------------------------------------------
-- 3. Dropping the clock, and restarting it.
--
-- Neither of these ends the round. Stopping leaves voting open with no
-- deadline — the state a round is in before anyone times it — and resetting
-- runs the same length again from now.
-- ---------------------------------------------------------------------------
create function public.stop_round(p_issue_id uuid)
returns public.issues
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_issue public.issues;
  v_uid   uuid := (select auth.uid());
begin
  select * into v_issue from public.issues where id = p_issue_id for update;

  if not found or v_issue.owner_id <> v_uid then
    raise exception 'poko: only the owner can stop the clock'
      using errcode = '42501', hint = 'poko_not_owner';
  end if;

  if v_issue.status <> 'voting' then
    raise exception 'poko: round % is closed', v_issue.round
      using errcode = 'P0001', hint = 'poko_round_closed';
  end if;

  -- round_duration_seconds is deliberately kept: it is what the room prefills
  -- the timer input with, so stopping and setting a new length starts from the
  -- last one rather than from nothing.
  update public.issues
     set round_ends_at   = null,
         round_paused_at = null,
         updated_at      = now()
   where id = p_issue_id
   returning * into v_issue;

  perform private.poko_broadcast(p_issue_id, 'issue_updated', jsonb_build_object(
    'round',           v_issue.round,
    'round_ends_at',   null,
    'round_paused_at', null,
    'server_now',      now()
  ));

  return v_issue;
end;
$$;

create function public.reset_round(p_issue_id uuid)
returns public.issues
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_issue public.issues;
  v_uid   uuid := (select auth.uid());
begin
  select * into v_issue from public.issues where id = p_issue_id for update;

  if not found or v_issue.owner_id <> v_uid then
    raise exception 'poko: only the owner can reset the clock'
      using errcode = '42501', hint = 'poko_not_owner';
  end if;

  if v_issue.status <> 'voting' then
    raise exception 'poko: round % is closed', v_issue.round
      using errcode = 'P0001', hint = 'poko_round_closed';
  end if;

  -- There has to be a length to go back to. A round that was never timed has
  -- nothing to reset, and inventing a default here would be this function
  -- quietly deciding the pace.
  if v_issue.round_duration_seconds is null then
    raise exception 'poko: this round has no length to reset to'
      using errcode = 'P0001', hint = 'poko_no_timebox';
  end if;

  -- Works from a running clock, a paused one, or a stopped one — in every case
  -- the answer is the same: the full length, starting now.
  update public.issues
     set round_started_at = now(),
         round_ends_at    = now()
                            + make_interval(secs => v_issue.round_duration_seconds),
         round_paused_at  = null,
         updated_at       = now()
   where id = p_issue_id
   returning * into v_issue;

  perform private.poko_broadcast(p_issue_id, 'issue_updated', jsonb_build_object(
    'round',           v_issue.round,
    'round_ends_at',   v_issue.round_ends_at,
    'round_paused_at', null,
    'server_now',      now()
  ));

  return v_issue;
end;
$$;

revoke all on function public.pause_round(uuid)  from public, anon;
revoke all on function public.resume_round(uuid) from public, anon;
revoke all on function public.stop_round(uuid)   from public, anon;
revoke all on function public.reset_round(uuid)  from public, anon;

grant execute on function public.pause_round(uuid)  to authenticated;
grant execute on function public.resume_round(uuid) to authenticated;
grant execute on function public.stop_round(uuid)   to authenticated;
grant execute on function public.reset_round(uuid)  to authenticated;


-- ---------------------------------------------------------------------------
-- 4. A paused round has not expired.
--
-- These two are the reason the pause representation needed explaining. Both
-- read "has the deadline passed?", and while paused `round_ends_at` sits in
-- the past — so without the extra clause, pausing a round would stop votes
-- landing and would hand any participant the authority to close it.
--
-- Only the expiry condition changes in each. Everything else is as it was.
-- ---------------------------------------------------------------------------
create or replace function private.poko_votes_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_issue public.issues;
  v_row   public.votes := coalesce(new, old);
begin
  -- THE serialization point for everything in this issue. Without it, two
  -- concurrent voters each count "have all voted?" under READ COMMITTED,
  -- neither sees the other's uncommitted row, and nobody closes the round.
  select * into v_issue from public.issues where id = v_row.issue_id for update;

  if not found then
    -- The issue itself is being deleted and this is the cascade. Nothing left
    -- to guard.
    if tg_op = 'DELETE' then
      return old;
    end if;

    raise exception 'poko: issue % not found', v_row.issue_id
      using errcode = 'no_data_found', hint = 'poko_issue_missing';
  end if;

  -- A cascade from a removed seat must also pass: the parent row is already
  -- gone by the time the referential action fires.
  if tg_op = 'DELETE' and not exists (
       select 1 from public.issue_participants ip
        where ip.issue_id = old.issue_id
          and ip.user_id  = old.user_id
     ) then
    return old;
  end if;

  if v_issue.status <> 'voting' then
    raise exception 'poko: round % is closed', v_issue.round
      using errcode = 'P0001', hint = 'poko_round_closed';
  end if;

  -- The deadline is enforced HERE, in the database. This is what makes the
  -- timebox real with no scheduler running at all: a purely client-side
  -- countdown would show 00:00 while votes kept landing.
  --
  -- `round_paused_at is null` is what makes a pause a pause. While held, the
  -- deadline is stale by design and voting has to stay open.
  if v_issue.round_paused_at is null
     and v_issue.round_ends_at is not null
     and now() >= v_issue.round_ends_at then
    raise exception 'poko: round % has expired', v_issue.round
      using errcode = 'P0001', hint = 'poko_round_expired';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  -- Optimistic concurrency for free: a client whose round was reopened while
  -- it was choosing gets a clean error instead of voting into the wrong round.
  if new.round <> v_issue.round then
    raise exception 'poko: vote is for round %, issue is on round %',
                    new.round, v_issue.round
      using errcode = 'P0001', hint = 'poko_stale_round';
  end if;

  if new.value <> all (v_issue.deck_values) then
    raise exception 'poko: % is not a card in this deck', new.value
      using errcode = 'P0001', hint = 'poko_value_not_in_deck';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

-- Owner always; any participant if the owner opted in; any participant once
-- the deadline has passed, because at that point the CLOCK is the authority —
-- and unlike a client's claim, that is a fact the database can verify.
--
-- A paused clock is not that fact. Without the pause clause, holding the clock
-- would quietly hand every participant the power to end the round.
create or replace function public.close_round(p_issue_id uuid)
returns public.issues
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_issue   public.issues;
  v_uid     uuid := (select auth.uid());
  v_expired boolean;
begin
  if v_uid is null then
    raise exception 'poko: sign in first'
      using errcode = '28000', hint = 'poko_not_signed_in';
  end if;

  select * into v_issue from public.issues where id = p_issue_id for update;

  if not found then
    raise exception 'poko: no such issue'
      using errcode = 'no_data_found', hint = 'poko_issue_missing';
  end if;

  -- Must be at the table at all before authority is even considered.
  if v_issue.owner_id <> v_uid
     and not exists (
       select 1 from public.issue_participants ip
        where ip.issue_id = p_issue_id and ip.user_id = v_uid
     ) then
    raise exception 'poko: not at this table'
      using errcode = '42501', hint = 'poko_not_participant';
  end if;

  v_expired := v_issue.round_paused_at is null
               and v_issue.round_ends_at is not null
               and now() >= v_issue.round_ends_at;

  if v_issue.owner_id <> v_uid
     and not v_issue.allow_participant_reveal
     and not v_expired then
    raise exception 'poko: only the owner can close this round early'
      using errcode = '42501', hint = 'poko_not_owner';
  end if;

  perform private.close_round_locked(
    p_issue_id,
    case when v_expired then 'timeout' else 'manual' end
  );

  select * into v_issue from public.issues where id = p_issue_id;
  return v_issue;
end;
$$;

-- Reopening starts a fresh pass, so it must also let go of the clock — a
-- pause instant carried into the new round would be a hold nobody applied.
create or replace function public.reopen_round(p_issue_id uuid)
returns public.issues
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_issue public.issues;
  v_uid   uuid := (select auth.uid());
begin
  select * into v_issue from public.issues where id = p_issue_id for update;

  if not found or v_issue.owner_id <> v_uid then
    raise exception 'poko: only the owner can reopen a round'
      using errcode = '42501', hint = 'poko_not_owner';
  end if;

  if v_issue.status <> 'closed' then
    return v_issue;  -- already open
  end if;

  update public.issues
     set round            = round + 1,
         status           = 'voting',
         estimate         = null,
         closed_at        = null,
         closed_reason    = null,
         round_started_at = now(),
         round_ends_at    = null,
         round_paused_at  = null,
         updated_at       = now()
   where id = p_issue_id
   returning * into v_issue;

  perform private.poko_broadcast(p_issue_id, 'round_reopened', jsonb_build_object(
    'round',         v_issue.round,
    'round_ends_at', v_issue.round_ends_at,
    'server_now',    now()
  ));

  return v_issue;
end;
$$;
