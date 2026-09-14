-- Deleting a game that has any votes was impossible.
--
-- The votes guard runs BEFORE DELETE and looks up the parent game to decide
-- whether the round is still open enough to allow the change. When the delete
-- is the CASCADE from `delete from public.games` — or from deleting a user,
-- which cascades to the games they own — that row is already gone by the time
-- the referential action fires, so the lookup found nothing and the guard
-- raised `poko_game_missing`, aborting a perfectly legitimate delete.
--
-- A missing game is only an error for a write. For a delete there is nothing
-- left to protect, so let it through. This mirrors the branch already below it
-- that lets the cascade from a removed seat pass.
--
-- Only the `not found` branch changes; the rest of the function is unchanged.
create or replace function private.poko_votes_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_game public.games;
  v_row  public.votes := coalesce(new, old);
begin
  -- THE serialization point for everything in this game. Without it, two
  -- concurrent voters each count "have all voted?" under READ COMMITTED,
  -- neither sees the other's uncommitted row, and nobody closes the round.
  select * into v_game from public.games where id = v_row.game_id for update;

  if not found then
    -- The game itself is being deleted and this is the cascade. Nothing left
    -- to guard.
    if tg_op = 'DELETE' then
      return old;
    end if;

    raise exception 'poko: game % not found', v_row.game_id
      using errcode = 'no_data_found', hint = 'poko_game_missing';
  end if;

  -- A cascade from a removed seat must also pass: the parent row is already
  -- gone by the time the referential action fires.
  if tg_op = 'DELETE' and not exists (
       select 1 from public.game_participants gp
        where gp.game_id = old.game_id
          and gp.user_id = old.user_id
     ) then
    return old;
  end if;

  if v_game.status <> 'voting' then
    raise exception 'poko: round % is closed', v_game.round
      using errcode = 'P0001', hint = 'poko_round_closed';
  end if;

  -- The deadline is enforced HERE, in the database. This is what makes the
  -- timebox real with no scheduler running at all: a purely client-side
  -- countdown would show 00:00 while votes kept landing.
  if v_game.round_ends_at is not null and now() >= v_game.round_ends_at then
    raise exception 'poko: round % has expired', v_game.round
      using errcode = 'P0001', hint = 'poko_round_expired';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  -- Optimistic concurrency for free: a client whose round was reopened while
  -- it was choosing gets a clean error instead of voting into the wrong round.
  if new.round <> v_game.round then
    raise exception 'poko: vote is for round %, game is on round %',
                    new.round, v_game.round
      using errcode = 'P0001', hint = 'poko_stale_round';
  end if;

  if new.value <> all (v_game.deck_values) then
    raise exception 'poko: % is not a card in this deck', new.value
      using errcode = 'P0001', hint = 'poko_value_not_in_deck';
  end if;

  new.updated_at := now();
  return new;
end;
$$;
