"use client"

import { startTransition, useOptimistic, useState } from "react"
import { Lock, Play, RotateCcw, Timer, Users } from "lucide-react"

import { InviteLink } from "@/components/dashboard/invite-link"
import { RoundOverNotice } from "@/components/dashboard/round-over-notice"
import { RoundTimer } from "@/components/dashboard/round-timer"
import { Seat } from "@/components/dashboard/seat"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import {
  castVote,
  closeRound,
  reopenRound,
  retractVote,
  startRound,
  type GameResult,
} from "@/lib/games/actions"
import type { RoomState } from "@/lib/games/model"
import { formatSeconds } from "@/lib/rooms/clock"
import { useCountdown } from "@/lib/rooms/use-countdown"
import { useCoalescedRefresh } from "@/lib/rooms/use-coalesced-refresh"
import { useRoomChannel } from "@/lib/rooms/use-room-channel"
import { cn } from "@/lib/utils"

type Burst = {
  message: string
  variant: "consensus" | "timeout"
}

/**
 * Decides whether a round closing is worth marking, from the `round_closed`
 * payload the closing transaction built.
 *
 * A split vote gets nothing. The cards flipping already shows the
 * disagreement, and that is a prompt to talk rather than something to
 * celebrate — the footer says so in words.
 */
function describeClose(payload: Record<string, unknown>): Burst | null {
  const estimate =
    typeof payload.estimate === "string" && payload.estimate.trim()
      ? payload.estimate
      : null

  // "Unanimous" is only honest when everybody actually voted, and
  // `all_voted` is the database saying precisely that. A round closed early or
  // on the clock can still carry an estimate — every card that was cast
  // agreed — but with empty seats that is one person's guess, not the team's.
  if (payload.closed_reason === "all_voted" && estimate) {
    return { message: `Unanimous — ${estimate}`, variant: "consensus" }
  }

  if (payload.closed_reason === "timeout") {
    // No confetti here: with seats still empty, not every card is on the
    // table, and running out of time is not an achievement.
    return { message: "Time's up — voting is closed", variant: "timeout" }
  }

  return null
}

/** The live estimation room for one game. */
function SessionRoom({ room }: { room: RoomState }) {
  const toast = useToast()
  const [burst, setBurst] = useState<Burst | null>(null)

  // Realtime is a signal, not a source: every event just asks the server for
  // the room again, so card values always come back through RLS.
  const refresh = useCoalescedRefresh()
  const online = useRoomChannel({
    gameId: room.id,
    userId: room.me?.userId ?? "",
    onEvent: (event) => {
      refresh()

      // The broadcast is the only reliable "it just happened" signal. Props
      // alone can't distinguish a round that has this instant closed from one
      // that was already closed when you opened it — and the second must not
      // throw confetti every time you click through the sidebar.
      if (event.type === "round_closed") setBurst(describeClose(event.payload))
    },
  })

  // The optimistic base is the server's value, so when a revalidation lands
  // mid-transition React re-runs this on top of the fresh data rather than
  // fighting it.
  const [optimisticVote, setOptimisticVote] = useOptimistic(
    room.me?.value ?? null
  )

  const closed = room.status === "closed"
  const deck = room.deck.values
  const alone = room.seats.length === 1

  // Subscribed here rather than inside each seat so there is one ticker for the
  // table. It costs a re-render of this subtree per second while a timed round
  // is open, which is cheap; `null` for an untimed round means no ticker runs
  // at all. The timer chip keeps its own subscription so the 1Hz label change
  // doesn't redraw the room.
  const { remaining } = useCountdown(
    !closed && room.roundEndsAt ? Date.parse(room.roundEndsAt) : null
  )
  const lastCall = remaining !== null && remaining > 0 && remaining <= 5

  function play(value: string | null) {
    startTransition(async () => {
      setOptimisticVote(value)

      const result =
        value === null
          ? await retractVote(room.id, room.round)
          : await castVote(room.id, room.round, value)

      // A rejected card is worth saying out loud: the optimistic value snaps
      // back on its own, which without an explanation just looks like the tap
      // didn't register.
      if (result.formError) {
        toast.add({ type: "error", title: result.formError })
      }
    })
  }

  /**
   * Fired by the countdown reaching zero. Any participant may close an expired
   * round — at that point the clock is the authority, not a person, and it is a
   * fact the database re-checks rather than a claim the client makes.
   *
   * Errors are swallowed on purpose. Every open tab's timer fires at roughly
   * the same moment, so all but the first will find the round already closed;
   * and a browser whose clock runs fast will be told it isn't expired yet.
   * Both are expected and neither is worth a message — the round simply stays
   * open until a clock the server agrees with catches up.
   */
  function closeOnExpiry() {
    startTransition(async () => {
      await closeRound(room.id)
    })
  }

  /**
   * Runs one of the round controls and reports the outcome in a toast.
   *
   * `success` is omitted where the room itself is the confirmation — starting
   * the clock swaps the button for a countdown, and a toast on top of that is
   * just noise.
   */
  function run(action: () => Promise<GameResult>, success?: string) {
    startTransition(async () => {
      const result = await action()

      if (result.formError) {
        toast.add({ type: "error", title: result.formError })
        return
      }

      if (success) toast.add({ type: "success", title: success })
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
          <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-[0.6875rem] font-semibold tracking-wide text-success uppercase">
            <span className="size-1.5 rounded-full bg-success" />
            Live
          </span>
        )}
      </div>

      {burst && (
        <RoundOverNotice
          message={burst.message}
          variant={burst.variant}
          onDone={() => setBurst(null)}
        />
      )}

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
            {/* A timebox can exist without having been started. The owner gets
                the button; everyone else sees how long it will be, so the
                round's shape isn't a surprise when it begins. */}
            {!closed &&
              room.timeboxSeconds !== null &&
              (room.roundEndsAt ? (
                <RoundTimer
                  deadline={room.roundEndsAt}
                  onExpire={closeOnExpiry}
                />
              ) : room.isOwner ? (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => run(() => startRound(room.id))}
                >
                  <Play className="size-4" aria-hidden="true" />
                  Start {formatSeconds(room.timeboxSeconds)} timer
                </Button>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-xs font-medium text-muted-foreground">
                  <Timer className="size-3.5" aria-hidden="true" />
                  {formatSeconds(room.timeboxSeconds)} · not started
                </span>
              ))}
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-primary">
              <Users className="size-3.5 text-secondary" aria-hidden="true" />
              {room.votedCount}/{room.seats.length}
            </span>
          </div>
        </div>

        {/* The table */}
        <div className="flex flex-col gap-5 rounded-2xl bg-surface p-4 sm:p-5">
          <ul className="flex flex-wrap gap-3">
            {room.seats.map((seat) => (
              <li key={seat.userId}>
                <Seat
                  seat={seat}
                  revealed={closed}
                  // You having this page open is a fact, not something to wait
                  // for a presence round-trip to confirm.
                  online={seat.isMe || online.has(seat.userId)}
                  urgent={lastCall}
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
                onClick={() =>
                  run(
                    () => reopenRound(room.id),
                    `Round ${room.round + 1} open — every card cleared`
                  )
                }
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
                onClick={() =>
                  run(() => closeRound(room.id), "Round closed — cards revealed")
                }
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

export { SessionRoom }
