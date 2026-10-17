-- What the team is actually estimating.
--
-- A game had only a name, which is fine for "Sprint 24 refinement" but not for
-- the story itself — the thing people need to read before they can pick a
-- card. Optional, because plenty of rounds are self-explanatory from the name.
--
-- Nullable with no default, so adding it needs no table rewrite.
alter table public.games
  add column summary text;

-- Null means "no summary". An empty or whitespace-only string would be a
-- second way to say the same thing, so it is rejected outright and the action
-- sends null instead.
alter table public.games
  add constraint games_summary_not_blank
  check (summary is null or btrim(summary) <> '');

-- Long enough for a couple of sentences, short enough that the room stays
-- readable. A story that needs more than this belongs in the tracker, with a
-- link here.
alter table public.games
  add constraint games_summary_length
  check (summary is null or length(summary) <= 500);

-- Column grants are additive, so this adds `summary` to the existing lists
-- without touching them. Editable as well as insertable: fixing a typo in the
-- story shouldn't mean recreating the game.
grant insert (summary) on public.games to authenticated;
grant update (summary) on public.games to authenticated;
