import {
  initialsFor,
  toGameDetail,
  toGameSummary,
  type GameSummary,
  type RoomState,
  type Seat,
} from "@/lib/games/model"
import { createClient } from "@/lib/supabase/server"

/**
 * Reads for server components. Plain async functions rather than server
 * actions, so an RSC calls them directly instead of paying a Server Action
 * round-trip.
 *
 * None of these filter by user: RLS already limits every row to games the
 * caller is seated at, so a query that forgot a `where` returns nothing rather
 * than everything.
 */

/**
 * Games this user can see, newest first. RLS limits that to games they are
 * seated at, which includes other people's — hence `userId`, so each row knows
 * whether it is yours to delete.
 */
async function listGames(userId: string): Promise<GameSummary[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("games")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) throw new Error(`Could not load games: ${error.message}`)

  return data.map((row) => toGameSummary(row, userId))
}

/**
 * One game plus its table, or null when the slug is unknown or not yours.
 *
 * Three queries rather than one embedded select: `votes` has no direct foreign
 * key to `games` (it hangs off the seat), and keeping them separate makes it
 * obvious that the vote read is the one the blind-voting policy filters.
 *
 * That filtering is the important part. This code does not decide which cards
 * you may see — it asks for all of them, and the database returns only your own
 * until the round closes. If the policy were wrong, this query would quietly
 * start returning everyone's cards, which is exactly why there is a pgTAP
 * assertion on it rather than a check here.
 */
async function getRoomState(
  slug: string,
  userId: string
): Promise<RoomState | null> {
  const supabase = await createClient()

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("*")
    .eq("slug", slug)
    .maybeSingle()

  if (gameError) throw new Error(`Could not load that game: ${gameError.message}`)
  if (!game) return null

  const [{ data: participants, error: seatError }, { data: votes, error: voteError }] =
    await Promise.all([
      supabase
        .from("game_participants")
        .select("*")
        .eq("game_id", game.id)
        .order("joined_at", { ascending: true }),
      supabase
        .from("votes")
        .select("user_id, value")
        .eq("game_id", game.id)
        .eq("round", game.round),
    ])

  if (seatError) throw new Error(`Could not load the table: ${seatError.message}`)
  if (voteError) throw new Error(`Could not load the cards: ${voteError.message}`)

  const valueByUser = new Map((votes ?? []).map((v) => [v.user_id, v.value]))

  const seats: Seat[] = (participants ?? []).map((row) => ({
    userId: row.user_id,
    displayName: row.display_name,
    initials: initialsFor(row.display_name),
    isOwner: row.user_id === game.owner_id,
    isMe: row.user_id === userId,
    // Comes from the seat, not the vote: it is readable by everyone at the
    // table precisely because it carries no card value.
    hasVoted: row.voted_round === game.round,
    value: valueByUser.get(row.user_id) ?? null,
  }))

  return {
    ...toGameDetail(game, userId),
    seats,
    me: seats.find((seat) => seat.isMe) ?? null,
    votedCount: seats.filter((seat) => seat.hasVoted).length,
  }
}

export { getRoomState, listGames }
