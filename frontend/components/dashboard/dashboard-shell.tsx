"use client"

import { useState } from "react"
import { Plus, Spade } from "lucide-react"

import { CreateGameDialog } from "@/components/dashboard/create-game-dialog"
import { GamesPanel } from "@/components/dashboard/games-panel"
import { SessionRoom } from "@/components/dashboard/session-room"
import { Button } from "@/components/ui/button"
import { createGame, type Game, type GameDraft } from "@/lib/games"

function DashboardShell({
  displayName,
  initials,
}: {
  displayName: string
  initials: string
}) {
  const [games, setGames] = useState<Game[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const activeGame = games.find((game) => game.id === activeId) ?? null

  function updateGame(id: string, change: (game: Game) => Game) {
    setGames((current) =>
      current.map((game) => (game.id === id ? change(game) : game))
    )
  }

  function handleCreate(draft: GameDraft) {
    const game = createGame(draft)

    // Newest first, and opened straight away.
    setGames((current) => [game, ...current])
    setActiveId(game.id)
  }

  return (
    <>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          {activeGame ? (
            <SessionRoom
              game={activeGame}
              displayName={displayName}
              initials={initials}
              onVote={(value) =>
                updateGame(activeGame.id, (game) => ({ ...game, vote: value }))
              }
              onCloseVoting={() =>
                updateGame(activeGame.id, (game) => ({
                  ...game,
                  status: "closed",
                  estimate: game.vote,
                }))
              }
              onReopenVoting={() =>
                updateGame(activeGame.id, (game) => ({
                  ...game,
                  status: "voting",
                  estimate: null,
                }))
              }
            />
          ) : (
            <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border bg-card px-6 py-16 text-center">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-secondary/15 text-secondary">
                <Spade className="size-6" aria-hidden="true" />
              </span>
              <div className="max-w-sm">
                <h2 className="text-lg font-semibold tracking-tight text-primary">
                  No game on the table yet
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  Name a game and pick a deck — Fibonacci, t-shirt sizes, powers
                  of two, or a set of cards you write yourself.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="xl"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="size-4" aria-hidden="true" />
                Create a game
              </Button>
            </div>
          )}
        </div>

        <GamesPanel
          games={games}
          activeId={activeId}
          onSelect={setActiveId}
          onCreate={() => setDialogOpen(true)}
        />
      </div>

      <CreateGameDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreate={handleCreate}
      />
    </>
  )
}

export { DashboardShell }
