"use client"

import { useState } from "react"
import { Pencil } from "lucide-react"

import { GameDialog } from "@/components/dashboard/game-dialog"
import type { Game } from "@/lib/games/model"

/**
 * Opens the game form pre-filled for editing.
 *
 * A thin wrapper so each sidebar row owns its own dialog state. The form reads
 * the game fresh every time it opens, so a name changed by realtime in the
 * meantime shows up rather than being stale.
 */
function EditGameButton({ game }: { game: Game }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        aria-label={`Edit ${game.name}`}
        onClick={() => setOpen(true)}
        className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center self-center rounded-lg text-muted-foreground transition-colors outline-none hover:bg-primary/5 hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Pencil className="size-4" aria-hidden="true" />
      </button>

      <GameDialog game={game} open={open} onOpenChange={setOpen} />
    </>
  )
}

export { EditGameButton }
