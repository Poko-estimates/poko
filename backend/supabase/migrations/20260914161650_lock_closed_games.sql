-- A closed game is a record of what the team decided, so its details stop
-- being editable: reopen the round first, which is a visible act everyone at
-- the table sees, rather than quietly rewriting a settled round.
--
-- Only the *editable* columns are frozen. The round transitions have to keep
-- working, and they all run through this same trigger:
--
--   reopen_round  changes status, round, estimate, closed_*, round_*_at
--   set_estimate  changes estimate
--
-- None of those touch the columns below, so they pass straight through. A
-- blanket "no updates while closed" would have deadlocked the product — you
-- could never reopen anything.
create or replace function private.poko_games_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'closed'
     and (new.name is distinct from old.name
          or new.summary is distinct from old.summary
          or new.deck_name is distinct from old.deck_name
          or new.deck_values is distinct from old.deck_values
          or new.round_duration_seconds is distinct from old.round_duration_seconds) then
    raise exception 'poko: round % is closed', old.round
      using errcode = 'P0001', hint = 'poko_game_closed';
  end if;

  -- Changing the deck under cards already on the table would leave votes whose
  -- value is no longer in the deck. Still needed for an OPEN round: the check
  -- above only covers closed ones.
  if new.deck_values is distinct from old.deck_values
     and exists (
       select 1 from public.votes v
        where v.game_id = old.id
          and v.round = old.round
     ) then
    raise exception 'poko: cards are already down in round %', old.round
      using errcode = 'P0001', hint = 'poko_deck_locked';
  end if;

  new.updated_at := now();
  return new;
end;
$$;
