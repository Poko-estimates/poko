"use client"

import { useState } from "react"
import { Pencil } from "lucide-react"

import { GameDialog } from "@/components/dashboard/game-dialog"
import type { Game } from "@/lib/games/model"
import { cn } from "@/lib/utils"

/**
 * Opens the game form pre-filled for editing.
 *
 * A thin wrapper so each sidebar row owns its own dialog state. The form reads
 * the game fresh every time it opens, so a name changed by realtime in the
 * meantime shows up rather than being stale.
 */
function EditGameButton({ game }: { game: Game }) {
  const [open, setOpen] = useState(false)

  // A closed round is a record of what the team decided. Reopening is the way
  // back to editing, and it's a visible act everyone at the table sees. The
  // database refuses these edits too, so this is a signpost rather than the
  // control.
  const locked = game.status === "closed"

  return (
    <>
      <button
        type="button"
        disabled={locked}
        title={locked ? "Reopen the round to edit this game" : undefined}
        aria-label={
          locked
            ? `Edit ${game.name} — reopen the round first`
            : `Edit ${game.name}`
        }
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex size-8 shrink-0 items-center justify-center self-center rounded-lg transition-colors outline-none",
          locked
            ? "cursor-not-allowed text-muted-foreground/40"
            : "cursor-pointer text-muted-foreground hover:bg-primary/5 hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
        )}
      >
        <Pencil className="size-4" aria-hidden="true" />
      </button>

      {!locked && (
        <GameDialog game={game} open={open} onOpenChange={setOpen} />
      )}
    </>
  )
}

export { EditGameButton }
