-- The round's length is chosen when the round starts, not when the issue is
-- created: you cannot know how long a story needs arguing about until you are
-- looking at it. `start_round` now takes the length.
--
-- That makes `round_duration_seconds` round machinery rather than a stored
-- setting, which is why the client's grants on it go away here — it now moves
-- only through start_round(), alongside `round_ends_at`, set together or not
-- at all. The column stays because it prefills the input next time.

-- 1. The duration stops being client-writable. Revoked as exactly that one
-- column, so the rest of each grant list is untouched.
revoke insert (round_duration_seconds) on public.issues from authenticated;
revoke update (round_duration_seconds) on public.issues from authenticated;

-- 2. Starting a round, with a length. Owner only — setting the pace is a
-- facilitation act. REPLACES the one-argument version rather than overloading:
-- an overload would leave the old path alive and callable.
drop function if exists public.start_round(uuid);

create function public.start_round(p_issue_id uuid, p_seconds integer)
returns public.issues
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_issue public.issues;
  v_uid   uuid := (select auth.uid());
begin
  -- Checked before anything is read, so a nonsense length cannot be the thing
  -- that reveals whether an issue exists. The bounds match the
  -- issues_duration_range CHECK: below ten seconds nobody can read the story,
  -- and an hour is longer than any single estimate is worth arguing about.
  if p_seconds is null or p_seconds < 10 or p_seconds > 3600 then
    raise exception 'poko: % is not a usable round length', p_seconds
      using errcode = 'P0001', hint = 'poko_bad_timebox';
  end if;

  select * into v_issue from public.issues where id = p_issue_id for update;

  if not found or v_issue.owner_id <> v_uid then
    raise exception 'poko: only the owner can start the clock'
      using errcode = '42501', hint = 'poko_not_owner';
  end if;

  if v_issue.status <> 'voting' then
    raise exception 'poko: round % is closed', v_issue.round
      using errcode = 'P0001', hint = 'poko_round_closed';
  end if;

  -- Already running. Returning quietly rather than raising makes a double
  -- click harmless, and refusing to re-derive the deadline means the clock
  -- cannot be quietly restarted — or lengthened — to hand out more time.
  if v_issue.round_ends_at is not null then
    return v_issue;
  end if;

  update public.issues
     set round_duration_seconds = p_seconds,
         round_started_at       = now(),
         round_ends_at          = now() + make_interval(secs => p_seconds),
         updated_at             = now()
   where id = p_issue_id
   returning * into v_issue;

  -- issue_updated rather than a new event name: every client needs to re-read
  -- and pick up the deadline, but a clock starting is not a moment to announce.
  perform private.poko_broadcast(p_issue_id, 'issue_updated', jsonb_build_object(
    'round',         v_issue.round,
    'round_ends_at', v_issue.round_ends_at,
    'server_now',    now()
  ));

  return v_issue;
end;
$$;

revoke all on function public.start_round(uuid, integer) from public, anon;
grant execute on function public.start_round(uuid, integer) to authenticated;

-- 3. The closed-issue freeze drops the duration: only start_round() can write
-- it now, and that already refuses on a closed round.
create or replace function private.poko_issues_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.poko_issue_sprint_is_owned(new.sprint_id, new.owner_id) then
    raise exception 'poko: that sprint is not yours'
      using errcode = '42501', hint = 'poko_sprint_not_yours';
  end if;

  if old.status = 'closed'
     and (new.name is distinct from old.name
          or new.key is distinct from old.key
          or new.summary is distinct from old.summary
          or new.deck_name is distinct from old.deck_name
          or new.deck_values is distinct from old.deck_values) then
    raise exception 'poko: round % is closed', old.round
      using errcode = 'P0001', hint = 'poko_issue_closed';
  end if;

  -- Changing the deck under cards already on the table would leave votes whose
  -- value is no longer in the deck. Still needed for an OPEN round: the check
  -- above only covers closed ones.
  if new.deck_values is distinct from old.deck_values
     and exists (
       select 1 from public.votes v
        where v.issue_id = old.id
          and v.round    = old.round
     ) then
    raise exception 'poko: cards are already down in round %', old.round
      using errcode = 'P0001', hint = 'poko_deck_locked';
  end if;

  new.updated_at := now();
  return new;
end;
$$;
