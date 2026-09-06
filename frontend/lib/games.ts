import type { Deck } from "@/lib/decks"

type GameStatus = "voting" | "closed"

type GameDraft = {
  name: string
  deck: Deck
}

type Game = GameDraft & {
  id: string
  status: GameStatus
  vote: string | null
  estimate: string | null
}

function createGame(draft: GameDraft): Game {
  return {
    ...draft,
    id: crypto.randomUUID(),
    status: "voting",
    vote: null,
    estimate: null,
  }
}

export { createGame }
export type { Game, GameDraft, GameStatus }
