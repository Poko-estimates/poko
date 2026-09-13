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
