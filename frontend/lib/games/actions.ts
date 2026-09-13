"use server"

import { revalidatePath } from "next/cache"

import { maxDeckValues, minDeckValues } from "@/lib/decks"
import type { GameDraft } from "@/lib/games/model"
import { createClient } from "@/lib/supabase/server"

/**
 * What a form gets back when the action does not redirect — same contract as
 * `AuthResult` in `lib/auth/actions.ts`. `formError` renders above the fields.
 */
export type GameResult = {
  formError?: string
}

export type CreateGameResult = GameResult & {
  /** Present on success, so the caller can open the room it just created. */
  slug?: string
}

export async function createGame(draft: GameDraft): Promise<CreateGameResult> {
  // A server action is a public endpoint. The create dialog validates all of
  // this too, but that validation is a courtesy to the user, not a control.
  const name = draft.name.trim()
  if (!name) return { formError: "Give the game a name." }

  const deckName = draft.deck.name.trim()
  if (!deckName) return { formError: "Give the deck a name." }

  const values = normaliseDeckValues(draft.deck.values)
  if (values.length < minDeckValues) {
    return { formError: `A deck needs at least ${minDeckValues} cards.` }
  }
  if (values.length > maxDeckValues) {
    return {
      formError: `A deck holds up to ${maxDeckValues} cards — that one has ${values.length}.`,
    }
  }

  const supabase = await createClient()

  // owner_id and slug are absent on purpose: the database supplies both, and
  // the client holds no grant on either column.
  const { data, error } = await supabase
    .from("games")
    .insert({
      name,
      deck_name: deckName,
      deck_values: values,
      round_duration_seconds: draft.timeboxSeconds,
    })
    .select("slug")
    .single()

  if (error) return { formError: describe(error) }

  revalidatePath("/dashboard")
  return { slug: data.slug }
}

/**
 * Puts your card down, or moves it if you already had one.
 *
 * Everything that decides whether this is legal right now — round still open,
 * deadline not passed, value actually in the deck, round not reopened
 * underneath you — lives in the guard trigger, which raises a distinct `hint`
 * for each case. That is deliberate: those are expected, user-facing
 * conditions, not authorization failures.
 */
export async function castVote(
  gameId: string,
  round: number,
  value: string
): Promise<GameResult> {
  const supabase = await createClient()

  // Insert first, then fall back to an update, rather than one upsert.
  //
  // PostgREST's ON CONFLICT DO UPDATE assigns every column in the payload, so
  // an upsert needs UPDATE on game_id and round as well as value — and the
  // client deliberately only holds UPDATE on `value`, so that a card can never
  // be moved to a different round or a different game. One extra round trip
  // when changing your mind is the right price for that narrower grant.
  //
  // user_id is absent from both calls on purpose: it defaults to auth.uid()
  // and the client holds no grant on it, so nobody can vote as someone else.
  const insert = await supabase
    .from("votes")
    .insert({ game_id: gameId, round, value })

  if (!insert.error) {
    revalidateGame()
    return {}
  }

  // 23505 means this player already has a card down for this round.
  if (insert.error.code !== "23505") {
    return { formError: describe(insert.error) }
  }

  // RLS narrows this to your own row; there is no need — and no way — to name
  // the user.
  const { error } = await supabase
    .from("votes")
    .update({ value })
    .eq("game_id", gameId)
    .eq("round", round)

  if (error) return { formError: describe(error) }

  revalidateGame()
  return {}
}

/** Takes your card back off the table. */
export async function retractVote(
  gameId: string,
  round: number
): Promise<GameResult> {
  const supabase = await createClient()

  // RLS narrows this to your own row; there is no way to clear anyone else's.
  const { error } = await supabase
    .from("votes")
    .delete()
    .eq("game_id", gameId)
    .eq("round", round)

  if (error) return { formError: describe(error) }

  revalidateGame()
  return {}
}

/**
 * Ends the round and reveals every card at once.
 *
 * The estimate is not passed in — `close_round` works it out, and records one
 * only if every card matches. An estimate the team did not agree on is not an
 * estimate.
 */
export async function closeRound(gameId: string): Promise<GameResult> {
  const supabase = await createClient()

  const { error } = await supabase.rpc("close_round", { p_game_id: gameId })
  if (error) return { formError: describe(error) }

  revalidateGame()
  return {}
}

/** Starts a fresh pass. The previous round's cards are kept, not deleted. */
export async function reopenRound(gameId: string): Promise<GameResult> {
  const supabase = await createClient()

  const { error } = await supabase.rpc("reopen_round", { p_game_id: gameId })
  if (error) return { formError: describe(error) }

  revalidateGame()
  return {}
}

/**
 * Re-renders the dashboard so the server's view of the round wins.
 *
 * Needed on the vote path today because a card can close the round out from
 * under the person who played it. Step 6 replaces this with the realtime
 * broadcast, which tells every client at once instead of only the one that
 * acted.
 */
function revalidateGame() {
  revalidatePath("/dashboard")
}

/** Trim, drop blanks, drop repeats — mirrors the deck CHECK on `games`. */
function normaliseDeckValues(values: string[]) {
  const seen = new Set<string>()

  for (const raw of values) {
    const value = raw.trim()
    if (value) seen.add(value)
  }

  return [...seen]
}

/**
 * Postgres and PostgREST errors are terse and leak schema detail; give the ones
 * a user can actually hit real copy. Same shape as `describe()` in
 * `lib/auth/actions.ts`.
 *
 * The `hint` values come from the guard triggers in the migration, which set
 * them precisely so the client can branch without parsing prose.
 */
function describe(error: { code?: string; hint?: string | null; message: string }) {
  switch (error.hint) {
    case "poko_round_closed":
      return "This round just closed — the cards are already on the table."
    case "poko_round_expired":
      return "Time's up on this round."
    case "poko_stale_round":
      return "This round was reopened while you were choosing. Have another look."
    case "poko_value_not_in_deck":
      return "That card isn't in this game's deck."
    case "poko_not_participant":
      return "You're not at this table."
    case "poko_not_owner":
      return "Only the person who created the game can do that."
    case "poko_room_missing":
      return "That invite link doesn't match a game."
    case "poko_not_signed_in":
      return "Sign in before joining a game."
  }

  // 42501 is an RLS or grant denial; PGRST116 is "no rows" from a .single().
  if (error.code === "42501") return "You don't have access to that game."
  if (error.code === "PGRST116") return "That game no longer exists."
  if (error.code === "23514") return "That deck isn't valid."

  return error.message
}
