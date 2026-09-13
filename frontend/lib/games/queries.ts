import {
  toGameDetail,
  toGameSummary,
  type GameDetail,
  type GameSummary,
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

/** Games this user can see, newest first. */
async function listGames(): Promise<GameSummary[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("games")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) throw new Error(`Could not load games: ${error.message}`)

  return data.map(toGameSummary)
}

/** One game by its slug, or null when it doesn't exist or isn't yours to see. */
async function getGameBySlug(
  slug: string,
  userId: string
): Promise<GameDetail | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("slug", slug)
    .maybeSingle()

  if (error) throw new Error(`Could not load that game: ${error.message}`)

  return data ? toGameDetail(data, userId) : null
}

export { getGameBySlug, listGames }
