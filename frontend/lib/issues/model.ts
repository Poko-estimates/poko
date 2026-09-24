import type { Tables } from "@/lib/supabase/database.types"

type IssueRow = Tables<"issues">

type Deck = {
  name: string
  values: string[]
}

const issueStatuses = ["voting", "closed"] as const
type IssueStatus = (typeof issueStatuses)[number]

/**
 * The sprint an issue is being refined in, or null when it has none.
 *
 * Optional throughout: the dialog's sprint field can be left empty, and the
 * sidebar groups anything without one under "Uncategorized" rather than
 * insisting every issue belong somewhere.
 */
type Sprint = {
  id: string
  name: string
}

/** An issue, as both the sidebar and the room need it. */
type Issue = {
  id: string
  slug: string
  name: string
  /** The tracker's identifier, e.g. "PK-231". Optional — not every team has one. */
  key: string | null
  sprint: Sprint | null
  deckName: string
  status: IssueStatus
  estimate: string | null
  round: number
  /** The sidebar only offers destructive actions on your own issues. */
  isOwner: boolean
  deck: Deck
  /** What the team is estimating, or null when the name says it all. */
  summary: string | null
  /**
   * The length of the round, in seconds, or null if one has never been run.
   *
   * Set by `start_round` rather than chosen when the issue is created, so this
   * is a record of the LAST length used — which is what the room's timer input
   * prefills from.
   */
  timeboxSeconds: number | null
  roundEndsAt: string | null
  /**
   * When the clock was held, or null when it is running (or stopped).
   *
   * While this is set, `roundEndsAt` is deliberately stale — the remaining
   * time is `roundEndsAt - roundPausedAt`, and resuming pushes the deadline
   * forward by however long the pause lasted. Anything asking "has the
   * deadline passed?" has to check this first.
   */
  roundPausedAt: string | null
}


type IssueDraft = {
  name: string
  /** Optional. Blank is normalised to null rather than stored as "". */
  key: string | null
  /**
   * The sprint by NAME, not by id.
   *
   * The dialog's sprint field creates on demand — type something that isn't in
   * the list and it becomes a sprint — so a name is the only thing the form
   * can honestly report. Resolving it to a row (finding the existing one, or
   * inserting it) belongs on the server, where the uniqueness constraint is.
   */
  sprintName: string | null
  deck: Deck
  /** Optional. Blank is normalised to null rather than stored as "". */
  summary: string | null
}

/**
 * One person at the table.
 *
 * `hasVoted` and `value` are deliberately separate. A null `value` is
 * ambiguous on its own — it means either "hasn't picked a card yet" or "has
 * picked one, and the round is still open so you aren't allowed to see it".
 * Card back versus empty seat is the whole visual point of blind voting, so
 * never collapse these two fields into one.
 */
type Seat = {
  userId: string
  displayName: string
  initials: string
  isOwner: boolean
  isMe: boolean
  hasVoted: boolean
  value: string | null
}

/** Everything the room renders from. */
type RoomState = Issue & {
  seats: Seat[]
  /** The signed-in player's own seat. */
  me: Seat | null
  votedCount: number
}

/**
 * Narrows the row's `text` status to the union above. Throws rather than
 * defaulting: reaching here with anything else means the CHECK constraint and
 * this code have diverged, which is a bug worth surfacing loudly instead of
 * quietly rendering the room as though voting were still open.
 */
function toIssueStatus(value: string): IssueStatus {
  if ((issueStatuses as readonly string[]).includes(value)) {
    return value as IssueStatus
  }

  throw new Error(`Unknown issue status from the database: ${value}`)
}

/**
 * The shape a row arrives in when the query embeds its sprint. PostgREST
 * returns an embedded to-one relation as an object or null, and null covers
 * both "no sprint" and "a sprint you cannot read" — which are the same thing
 * as far as rendering goes.
 */
type IssueRowWithSprint = IssueRow & {
  sprints?: Sprint | null
}

function toIssue(row: IssueRowWithSprint, userId: string): Issue {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    key: row.key,
    sprint: row.sprints ?? null,
    deckName: row.deck_name,
    status: toIssueStatus(row.status),
    estimate: row.estimate,
    round: row.round,
    isOwner: row.owner_id === userId,
    deck: { name: row.deck_name, values: row.deck_values },
    summary: row.summary,
    timeboxSeconds: row.round_duration_seconds,
    roundEndsAt: row.round_ends_at,
    roundPausedAt: row.round_paused_at,
  }
}


/** Two-letter seat label: "Jane Doe" -> "JD", "jane.doe" -> "JD". */
function initialsFor(name: string) {
  const parts = name.split(/[\s.\-_+]/).filter(Boolean)
  const letters =
    parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2)

  return letters.toUpperCase()
}

export { initialsFor, issueStatuses, toIssue, toIssueStatus }
export type {
  Deck,
  Issue,
  IssueDraft,
  IssueRow,
  IssueRowWithSprint,
  IssueStatus,
  RoomState,
  Seat,
  Sprint,
}
