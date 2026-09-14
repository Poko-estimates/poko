import type { Tables } from "@/lib/supabase/database.types"

type GameRow = Tables<"games">

type Deck = {
  name: string
  values: string[]
}

const gameStatuses = ["voting", "closed"] as const
type GameStatus = (typeof gameStatuses)[number]

/** A game, as both the sidebar and the room need it. */
type Game = {
  id: string
  slug: string
  name: string
  deckName: string
  status: GameStatus
  estimate: string | null
  round: number
  /** The sidebar only offers destructive actions on your own games. */
  isOwner: boolean
  deck: Deck
  /** What the team is estimating, or null when the name says it all. */
  summary: string | null
  timeboxSeconds: number | null
  roundEndsAt: string | null
}


type GameDraft = {
  name: string
  deck: Deck
  /** Optional. Blank is normalised to null rather than stored as "". */
  summary: string | null
  timeboxSeconds: number | null
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
type RoomState = Game & {
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
function toGameStatus(value: string): GameStatus {
  if ((gameStatuses as readonly string[]).includes(value)) {
    return value as GameStatus
  }

  throw new Error(`Unknown game status from the database: ${value}`)
}

function toGame(row: GameRow, userId: string): Game {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    deckName: row.deck_name,
    status: toGameStatus(row.status),
    estimate: row.estimate,
    round: row.round,
    isOwner: row.owner_id === userId,
    deck: { name: row.deck_name, values: row.deck_values },
    summary: row.summary,
    timeboxSeconds: row.round_duration_seconds,
    roundEndsAt: row.round_ends_at,
  }
}


/** Two-letter seat label: "Jane Doe" -> "JD", "jane.doe" -> "JD". */
function initialsFor(name: string) {
  const parts = name.split(/[\s.\-_+]/).filter(Boolean)
  const letters =
    parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2)

  return letters.toUpperCase()
}

export { gameStatuses, initialsFor, toGame, toGameStatus }
export type {
  Deck,
  Game,
  GameDraft,
  GameRow,
  GameStatus,
  RoomState,
  Seat,
}
