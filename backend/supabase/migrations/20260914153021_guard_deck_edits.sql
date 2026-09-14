-- Editing a game is now possible from the sidebar, which opens one hole worth
-- closing: changing the deck while cards are already on the table.
--
-- Nothing re-validates existing votes when `deck_values` changes, so a round
-- could end up holding cards whose faces are no longer in the deck — the hand
-- would not show them, and `poko_votes_guard` only checks a value on the way
-- in. The estimate is already protected by `games_estimate_in_deck`; this does
-- the same for votes in flight.
--
-- Enforced here rather than in the server action so it holds whatever route
-- the update arrives by, including a direct PATCH from the browser.
create or replace function private.poko_games_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
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

-- Fires for every update, including the security-definer round transitions.
-- None of those touch deck_values, so they pass straight through; they only
-- gain the updated_at stamp they were already setting by hand.
create trigger games_before_update
before update on public.games
for each row execute function private.poko_games_before_update();
