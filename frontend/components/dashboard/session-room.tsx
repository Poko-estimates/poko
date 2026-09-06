"use client"

import { Lock, RotateCcw, Timer, Users } from "lucide-react"

import { InviteLink } from "@/components/dashboard/invite-link"
import { Button } from "@/components/ui/button"
import { slugify } from "@/lib/decks"
import type { Game } from "@/lib/games"
import { cn } from "@/lib/utils"

/**
 * The live estimation room for one game. Until someone joins through the invite
 * link the only seat at the table is yours — picking a card puts it down,
 * picking it again takes it back, and closing the round puts the estimate on
 * record.
 */
function SessionRoom({
  displayName,
  game,
  initials,
  onCloseVoting,
  onReopenVoting,
  onVote,
}: {
  displayName: string
  game: Game
  initials: string
  onCloseVoting: () => void
  onReopenVoting: () => void
  onVote: (value: string | null) => void
}) {
  const deck = game.deck.values
  const slug = slugify(game.name)
  const closed = game.status === "closed"

  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-[0_45px_90px_-45px_rgba(20,33,61,0.5)]">
      {/* Window chrome, matching the marketing mockup */}
      <div className="flex items-center gap-3 bg-primary px-5 py-3.5">
        <div className="flex shrink-0 gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-white/25" />
          <span className="size-2.5 rounded-full bg-white/25" />
          <span className="size-2.5 rounded-full bg-white/25" />
        </div>
        <p className="min-w-0 truncate font-mono text-xs text-white/60">
          poko.app/room/{slug}
        </p>
        {closed ? (
          <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[0.6875rem] font-semibold tracking-wide text-white/70 uppercase">
            <Lock className="size-3" aria-hidden="true" />
            Closed
          </span>
        ) : (
          <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full bg-secondary/15 px-2.5 py-1 text-[0.6875rem] font-semibold tracking-wide text-secondary uppercase">
            <span className="size-1.5 rounded-full bg-secondary" />
            Live
          </span>
        )}
      </div>

      <div className="space-y-6 p-5 sm:p-8">
        {/* What the room is voting on */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-secondary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                {game.deck.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {deck.length} cards · everyone votes, then the table flips
              </span>
            </div>
            <h2 className="mt-2 text-lg font-semibold text-primary sm:text-xl">
              {game.name}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 font-mono text-xs font-medium text-primary">
              <Timer className="size-3.5 text-secondary" aria-hidden="true" />
              01:12
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-primary">
              <Users className="size-3.5 text-secondary" aria-hidden="true" />
              {game.vote ? "1" : "0"}/1
            </span>
          </div>
        </div>

        {/* The table: you, and room for everyone you invite */}
        <div className="flex flex-col gap-5 rounded-2xl bg-surface p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-20 w-15 shrink-0 items-center justify-center rounded-xl px-1 text-center text-xl font-semibold tabular-nums",
                game.vote
                  ? "bg-primary text-white"
                  : "border-2 border-dashed border-border bg-card text-muted-foreground"
              )}
            >
              {game.vote ?? (
                <span className="flex gap-0.5" aria-hidden="true">
                  <span className="size-1.5 rounded-full bg-current" />
                  <span className="size-1.5 rounded-full bg-current" />
                  <span className="size-1.5 rounded-full bg-current" />
                </span>
              )}
            </div>

            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[0.625rem] font-bold text-primary">
                  {initials}
                </span>
                <span className="truncate">You</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {game.vote ? `Card down: ${game.vote}` : "Still choosing"}
              </p>
              <span className="sr-only">
                {game.vote
                  ? `${displayName} voted ${game.vote}`
                  : `${displayName} is still voting`}
              </span>
            </div>
          </div>

          <div className="min-w-0 flex-1 sm:border-l sm:border-border sm:pl-6">
            {closed ? (
              <>
                <p className="text-sm font-medium text-primary">
                  Voting is closed
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  This round is on record. Reopen it if the team wants another
                  pass.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-primary">
                  You&apos;re the only one at the table
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  Send this link to whoever should be estimating with you.
                </p>
                <div className="mt-2.5">
                  <InviteLink slug={slug} />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Your deck */}
        <div>
          <p className="mb-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Your hand
          </p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
            {deck.map((value) => {
              const selected = value === game.vote

              return (
                <button
                  key={value}
                  type="button"
                  disabled={closed}
                  aria-pressed={selected}
                  onClick={() => onVote(selected ? null : value)}
                  className={cn(
                    "flex h-16 items-center justify-center rounded-xl border px-1 text-center text-base font-semibold tabular-nums transition-all outline-none focus-visible:ring-3 focus-visible:ring-secondary/50",
                    selected
                      ? "border-secondary bg-secondary text-primary"
                      : "border-border bg-card text-primary",
                    closed
                      ? "cursor-not-allowed opacity-50"
                      : cn(
                          "hover:-translate-y-0.5 hover:border-secondary/50",
                          selected && "-translate-y-1"
                        )
                  )}
                >
                  {value}
                </button>
              )
            })}
          </div>
        </div>

        {/* Settling the round */}
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface px-4 py-4">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">
              {closed ? "Saved estimate" : "This round"}
            </p>
            <p className="text-sm font-semibold text-primary">
              {closed
                ? `${game.estimate} · ${game.deck.name}`
                : game.vote
                  ? "Ready to close — your card is down"
                  : "Pick a card to settle the round"}
            </p>
          </div>

          {closed ? (
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={onReopenVoting}
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Reopen voting
            </Button>
          ) : (
            <Button
              type="button"
              variant="default"
              size="lg"
              disabled={game.vote === null}
              onClick={onCloseVoting}
            >
              <Lock className="size-4" aria-hidden="true" />
              Close voting &amp; save
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}

export { SessionRoom }
