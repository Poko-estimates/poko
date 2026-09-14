   "use client"

import Link from "next/link"
import { CheckCircle2, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { GameSummary } from "@/lib/games/model"
import { cn } from "@/lib/utils"

/**
 * The list of games, newest first. Selection lives in the URL rather than in
 * component state, so it survives a reload, can be linked to, and lets the
 * server render the room for the chosen game.
 */
function GamesPanel({
  activeSlug,
  games,
  onCreate,
}: {
  activeSlug: string | null
  games: GameSummary[]
  onCreate: () => void
}) {
  const open = games.filter((game) => game.status === "voting").length

  return (
    <aside className="lg:sticky lg:top-6 lg:w-80 lg:shrink-0">
      <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-primary">Games</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {games.length === 0
                ? "Nothing on the table yet"
                : `${games.length} created · ${open} still voting`}
            </p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={onCreate}>
            <Plus className="size-3.5" aria-hidden="true" />
            New
          </Button>
        </div>

        {games.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-xs leading-relaxed text-muted-foreground">
            Create a game to open the table.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {games.map((game) => {
              const active = game.slug === activeSlug
              const closed = game.status === "closed"

              return (
                <li key={game.id}>
                  <Link
                    href={`/dashboard?game=${game.slug}`}
                    prefetch
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "block rounded-2xl border px-3.5 py-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                      active
                        ? "border-secondary bg-secondary/10"
                        : "border-transparent bg-surface hover:border-secondary/40"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-primary">
                        {game.name}
                      </span>
                      {closed && (
                        <CheckCircle2
                          className="size-3.5 shrink-0 text-secondary"
                          aria-hidden="true"
                        />
                      )}
                    </span>

                    <span className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="truncate">{game.deckName}</span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={cn(
                          "shrink-0 font-medium",
                          closed ? "text-primary" : "text-muted-foreground"
                        )}
                      >
                        {closed
                          ? game.estimate
                            ? `Saved ${game.estimate}`
                            : "No consensus"
                          : "Voting"}
                      </span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </aside>
  )
}

export { GamesPanel }
