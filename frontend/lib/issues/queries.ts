import {
  initialsFor,
  toIssue,
  type Issue,
  type RoomState,
  type Seat,
} from "@/lib/issues/model"
import { createClient } from "@/lib/supabase/server"

/**
 * Reads for server components. Plain async functions rather than server
 * actions, so an RSC calls them directly instead of paying a Server Action
 * round-trip.
 *
 * None of these filter by user: RLS already limits every row to issues the
 * caller is seated at, so a query that forgot a `where` returns nothing rather
 * than everything.
 */

/**
 * Issues this user can see, in the order they keep them.
 *
 * Two queries rather than an embedded select: `issue_order` is per-viewer, so
 * there is exactly one matching row per issue at most and PostgREST cannot
 * order the outer rows by an embedded column anyway. The sort happens here.
 *
 * Neither query filters by user. RLS limits the issues to ones this person is
 * seated at — which includes other people's, hence `userId`, so each row knows
 * whether it is yours to delete — and limits `issue_order` to your own rows,
 * so somebody else's arrangement can never leak into yours.
 */
async function listIssues(userId: string): Promise<Issue[]> {
  const supabase = await createClient()

  const [
    { data: rows, error },
    { data: ranks, error: rankError },
  ] = await Promise.all([
    supabase.from("issues").select("*").order("created_at", { ascending: false }),
    supabase.from("issue_order").select("issue_id, sort_order"),
  ])

  if (error) throw new Error(`Could not load issues: ${error.message}`)
  if (rankError) {
    throw new Error(`Could not load your issue order: ${rankError.message}`)
  }

  const rankByIssue = new Map((ranks ?? []).map((r) => [r.issue_id, r.sort_order]))

  // Unranked issues lead, keeping the newest-first order the query returned.
  //
  // That absence is the interesting case: an issue you have never dragged has
  // no row at all, so a brand-new one surfaces at the top where you just made
  // it, and a list nobody has ever reordered renders exactly as it did before
  // ordering existed. Array.prototype.sort is stable, so the `0` below really
  // does preserve created_at desc within that group.
  return rows
    .map((row) => toIssue(row, userId))
    .sort((a, b) => {
      const rankA = rankByIssue.get(a.id)
      const rankB = rankByIssue.get(b.id)

      if (rankA === undefined && rankB === undefined) return 0
      if (rankA === undefined) return -1
      if (rankB === undefined) return 1

      return rankA - rankB
    })
}

/**
 * One issue plus its table, or null when the slug is unknown or not yours.
 *
 * Three queries rather than one embedded select: `votes` has no direct foreign
 * key to `issues` (it hangs off the seat), and keeping them separate makes it
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

  const { data: issue, error: issueError } = await supabase
    .from("issues")
    .select("*")
    .eq("slug", slug)
    .maybeSingle()

  if (issueError) {
    throw new Error(`Could not load that issue: ${issueError.message}`)
  }
  if (!issue) return null

  const [{ data: participants, error: seatError }, { data: votes, error: voteError }] =
    await Promise.all([
      supabase
        .from("issue_participants")
        .select("*")
        .eq("issue_id", issue.id)
        .order("joined_at", { ascending: true }),
      supabase
        .from("votes")
        .select("user_id, value")
        .eq("issue_id", issue.id)
        .eq("round", issue.round),
    ])

  if (seatError) throw new Error(`Could not load the table: ${seatError.message}`)
  if (voteError) throw new Error(`Could not load the cards: ${voteError.message}`)

  const valueByUser = new Map((votes ?? []).map((v) => [v.user_id, v.value]))

  const seats: Seat[] = (participants ?? []).map((row) => ({
    userId: row.user_id,
    displayName: row.display_name,
    initials: initialsFor(row.display_name),
    isOwner: row.user_id === issue.owner_id,
    isMe: row.user_id === userId,
    // Comes from the seat, not the vote: it is readable by everyone at the
    // table precisely because it carries no card value.
    hasVoted: row.voted_round === issue.round,
    value: valueByUser.get(row.user_id) ?? null,
  }))

  return {
    ...toIssue(issue, userId),
    seats,
    me: seats.find((seat) => seat.isMe) ?? null,
    votedCount: seats.filter((seat) => seat.hasVoted).length,
  }
}

export { getRoomState, listIssues }
