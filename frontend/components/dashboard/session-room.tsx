"use client"

import { startTransition, useOptimistic, useState } from "react"
import { Lock, RotateCcw, Timer, Users } from "lucide-react"

import { FormAlert } from "@/components/auth/form-alert"
import { InviteLink } from "@/components/dashboard/invite-link"
import { Seat } from "@/components/dashboard/seat"
import { Button } from "@/components/ui/button"
import {
  castVote,
  closeRound,
  reopenRound,
  retractVote,
} from "@/lib/games/actions"
import type { RoomState } from "@/lib/games/model"
import { cn } from "@/lib/utils"

/** The live estimation room for one game. */
function SessionRoom({ room }: { room: RoomState }) {
  const [error, setError] = useState<string | null>(null)

  // The optimistic base is the server's value, so when a revalidation lands
  // mid-transition React re-runs this on top of the fresh data rather than
  // fighting it.
  const [optimisticVote, setOptimisticVote] = useOptimistic(
    room.me?.value ?? null
  )

  const closed = room.status === "closed"
  const deck = room.deck.values
  const alone = room.seats.length === 1

  function play(value: string | null) {
    setError(null)

    startTransition(async () => {
      setOptimisticVote(value)

      const result =
        value === null
          ? await retractVote(room.id, room.round)
          : await castVote(room.id, room.round, value)

      // State updates after an await are not automatically part of the
      // transition, so they need their own.
      if (result.formError) {
        startTransition(() => setError(result.formError ?? null))
      }
    })
  }

  function settle(action: () => Promise<{ formError?: string }>) {
    setError(null)

    startTransition(async () => {
      const result = await action()
      if (result.formError) {
        startTransition(() => setError(result.formError ?? null))
      }
    })
  }

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
          poko.app/room/{room.slug}
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
                {room.deck.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {deck.length} cards
                {room.round > 1 ? ` · round ${room.round}` : ""}
              </span>
            </div>
            <h2 className="mt-2 text-lg font-semibold text-primary sm:text-xl">
              {room.name}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {room.timeboxSeconds !== null && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 font-mono text-xs font-medium text-primary">
                <Timer className="size-3.5 text-secondary" aria-hidden="true" />
                {formatTimebox(room.timeboxSeconds)}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-primary">
              <Users className="size-3.5 text-secondary" aria-hidden="true" />
              {room.votedCount}/{room.seats.length}
            </span>
          </div>
        </div>

        {error && <FormAlert>{error}</FormAlert>}

        {/* The table */}
        <div className="flex flex-col gap-5 rounded-2xl bg-surface p-4 sm:p-5">
          <ul className="flex flex-wrap gap-3">
            {room.seats.map((seat) => (
              <li key={seat.userId}>
                <Seat
                  seat={seat}
                  revealed={closed}
                  optimisticVote={seat.isMe ? optimisticVote : undefined}
                />
              </li>
            ))}
          </ul>

          {alone && !closed && (
            <div className="border-t border-border pt-4">
              <p className="text-sm font-medium text-primary">
                You&apos;re the only one at the table
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Send this link to whoever should be estimating with you.
              </p>
              <div className="mt-2.5">
                <InviteLink slug={room.slug} />
              </div>
            </div>
          )}
        </div>

        {/* Your hand */}
        <div>
          <p className="mb-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Your hand
          </p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
            {deck.map((value) => {
              const selected = value === optimisticVote

              return (
                <button
                  key={value}
                  type="button"
                  // Gated on the server's status, never on optimistic state: a
                  // card in flight must not re-enable a closed hand.
                  disabled={closed}
                  aria-pressed={selected}
                  onClick={() => play(selected ? null : value)}
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
                ? (room.estimate ?? "No consensus — talk it over and re-vote")
                : optimisticVote
                  ? "Ready when the table is"
                  : "Pick a card to get started"}
            </p>
          </div>

          {room.isOwner &&
            (closed ? (
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => settle(() => reopenRound(room.id))}
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                Reopen voting
              </Button>
            ) : (
              <Button
                type="button"
                variant="default"
                size="lg"
                disabled={room.votedCount === 0}
                onClick={() => settle(() => closeRound(room.id))}
              >
                <Lock className="size-4" aria-hidden="true" />
                Close voting now
              </Button>
            ))}
        </div>
      </div>
    </section>
  )
}

/** "90" -> "1:30", "300" -> "5:00". */
function formatTimebox(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60

  return `${minutes}:${String(rest).padStart(2, "0")}`
}

export { SessionRoom }
