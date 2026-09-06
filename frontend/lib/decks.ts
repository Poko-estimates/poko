/** The card set a room votes with. */
type Deck = {
  /** Shown on the room header, e.g. "Fibonacci" or a custom deck's own name. */
  name: string
  /** Card faces, in the order they're dealt. Any string, emoji included. */
  values: string[]
}

type DeckPreset = Deck & {
  id: string
  tagline: string
}

/** The ready-made decks offered in the create-game dialog. */
const deckPresets: DeckPreset[] = [
  {
    id: "fibonacci",
    name: "Fibonacci",
    tagline: "The default for story points — gaps widen as certainty drops.",
    values: ["0", "1", "2", "3", "5", "8", "13", "21", "?", "☕"],
  },
  {
    id: "t-shirt",
    name: "T-shirt sizes",
    tagline: "Relative sizing without the false precision of numbers.",
    values: ["XS", "S", "M", "L", "XL", "XXL", "?", "☕"],
  },
  {
    id: "powers-of-two",
    name: "Powers of two",
    tagline: "Doubling steps, for teams that think in orders of magnitude.",
    values: ["1", "2", "4", "8", "16", "32", "64", "?", "☕"],
  },
]

/** How many cards a custom deck may hold before the table gets unreadable. */
const maxDeckValues = 16

/** Fewer than this and there is nothing to choose between. */
const minDeckValues = 2

/**
 * Splits the custom-deck input into card faces. Commas and newlines both
 * separate, blanks are dropped, and repeats are ignored so one value can't be
 * dealt twice.
 */
function parseDeckValues(input: string): string[] {
  const seen = new Set<string>()

  for (const raw of input.split(/[,\n]/)) {
    const value = raw.trim()
    if (value) seen.add(value)
  }

  return [...seen]
}

/** URL-ish room slug for display, e.g. "Atlas · Sprint 24" -> "atlas-sprint-24". */
function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return slug || "new-room"
}

export { deckPresets, maxDeckValues, minDeckValues, parseDeckValues, slugify }
export type { Deck, DeckPreset }
