"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { maxDeckValues, maxSummaryLength, minDeckValues } from "@/lib/decks"
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

  // Blank and whitespace-only both mean "no summary", and the column's CHECK
  // rejects an empty string, so normalise before it gets there.
  const summary = draft.summary?.trim() || null
  if (summary && summary.length > maxSummaryLength) {
    return {
      formError: `Keep the summary under ${maxSummaryLength} characters — link to the ticket for the detail.`,
    }
  }

  const supabase = await createClient()

  // owner_id and slug are absent on purpose: the database supplies both, and
  // the client holds no grant on either column.
  const { data, error } = await supabase
    .from("games")
    .insert({
      name,
      summary,
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
 * Deletes a game and everything hanging off it — seats, and every round's
 * cards — in one cascade. There is no undo and no soft delete, which is why
 * the UI puts a confirmation in front of it.
 *
 * Owner only, enforced by the `games_delete_owner` policy rather than checked
 * here: a participant calling this simply matches no rows.
 */
export async function deleteGame(gameId: string): Promise<GameResult> {
  const supabase = await createClient()

  // `.select()` so we can tell "deleted" from "matched nothing". RLS turns a
  // non-owner's delete into zero rows rather than an error, which would
  // otherwise look like success.
  const { data, error } = await supabase
    .from("games")
    .delete()
    .eq("id", gameId)
    .select("id")

  if (error) return { formError: describe(error) }
  if (!data?.length) {
    return { formError: "That game is already gone, or isn't yours to delete." }
  }

  revalidateGame()
  return {}
}

/**
 * Starts the round's clock.
 *
 * Separate from creating the game on purpose: a countdown that began when the
 * dialog closed would already be running before anyone had read the story or
 * followed the invite link.
 */
export async function startRound(gameId: string): Promise<GameResult> {
  const supabase = await createClient()

  const { error } = await supabase.rpc("start_round", { p_game_id: gameId })
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
 * Takes a seat at a game from its invite link.
 *
 * Possession of the slug is the invitation — there is no RLS formulation of
 * "you may read the row whose slug you can name" — so joining goes through the
 * `join_game` function rather than a direct insert. It is idempotent, so
 * re-opening the link is harmless.
 *
 * This runs as a server action rather than in the browser on purpose: the
 * session cookie set by `signInAnonymously` goes out on this response, so the
 * next request renders as a participant. Signing in from the browser would
 * leave the already-rendered server tree stale and open a window where the
 * browser holds a session the server doesn't know about.
 */
export async function joinRoom(
  slug: string,
  displayName: string
): Promise<GameResult> {
  const name = displayName.trim()
  if (!name) return { formError: "Pick a name your team will recognise." }

  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  // Someone already signed in joins under their own account. This guard is
  // essential rather than tidy: signInAnonymously does not refuse when a
  // session exists, it REPLACES it — so without it, clicking a colleague's
  // invite would quietly sign you out of your own account into a throwaway one.
  if (!data?.claims) {
    const { error } = await supabase.auth.signInAnonymously({
      // Display only, and only used to seed the seat name below.
      options: { data: { full_name: name } },
    })

    if (error) {
      // The project allows a limited number of guests per hour per IP, and a
      // whole team shares one office address.
      return {
        formError: /rate limit|too many/i.test(error.message)
          ? "A lot of people have joined from this network in the last hour. Try again shortly."
          : error.message,
      }
    }
  }

  const { error } = await supabase.rpc("join_game", {
    p_slug: slug,
    p_display_name: name,
  })

  if (error) return { formError: describe(error) }

  // The header now shows a name and the room has become readable, so the whole
  // tree needs re-rendering — same shape as signIn in lib/auth/actions.ts.
  revalidatePath("/", "layout")
  redirect(`/room/${slug}`)
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
    case "poko_no_timebox":
      return "This game has no timebox to start."
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
