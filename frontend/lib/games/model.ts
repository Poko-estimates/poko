import type { Tables } from "@/lib/supabase/database.types"

type GameRow = Tables<"games">

type Deck = {
  name: string
  values: string[]
}

const gameStatuses = ["voting", "closed"] as const
type GameStatus = (typeof gameStatuses)[number]

type GameSummary = {
  id: string
  slug: string
  name: string
  deckName: string
  status: GameStatus
  estimate: string | null
  round: number
}

type GameDetail = GameSummary & {
  deck: Deck
  timeboxSeconds: number | null
  roundEndsAt: string | null
  isOwner: boolean
}

type GameDraft = {
  name: string
  deck: Deck
  timeboxSeconds: number | null
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

function toGameSummary(row: GameRow): GameSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    deckName: row.deck_name,
    status: toGameStatus(row.status),
    estimate: row.estimate,
    round: row.round,
  }
}

function toGameDetail(row: GameRow, userId: string): GameDetail {
  return {
    ...toGameSummary(row),
    deck: { name: row.deck_name, values: row.deck_values },
    timeboxSeconds: row.round_duration_seconds,
    roundEndsAt: row.round_ends_at,
    isOwner: row.owner_id === userId,
  }
}

export { gameStatuses, toGameDetail, toGameStatus, toGameSummary }
export type { Deck, GameDetail, GameDraft, GameRow, GameStatus, GameSummary }
