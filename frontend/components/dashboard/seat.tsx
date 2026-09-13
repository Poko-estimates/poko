import type { Seat as SeatModel } from "@/lib/games/model"
import { cn } from "@/lib/utils"

/**
 * One person at the table, in one of three states:
 *
 *   empty      — no card down yet
 *   face down  — a card is down, and you aren't allowed to see it
 *   face up    — your own card, or anyone's once the round closed
 *
 * The middle state is the point of the whole feature. It has to be visibly
 * different from an empty seat — you need to see that someone has voted
 * without seeing what they voted — which is why the model keeps `hasVoted`
 * separate from `value` rather than inferring one from the other.
 */
function Seat({
  optimisticVote,
  revealed,
  seat,
}: {
  /** Only passed for your own seat, so a card you just played shows instantly. */
  optimisticVote?: string | null
  revealed: boolean
  seat: SeatModel
}) {
  const pending = optimisticVote !== undefined
  const value = pending ? optimisticVote : seat.value
  const hasVoted = pending ? optimisticVote !== null : seat.hasVoted
  const faceUp = hasVoted && value !== null && (revealed || seat.isMe)

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col items-center gap-2.5 rounded-2xl p-3 sm:p-4",
        seat.isMe ? "bg-secondary/12 ring-1 ring-secondary/35" : "bg-card"
      )}
    >
      <div
        className={cn(
          "flex h-20 w-15 items-center justify-center rounded-xl px-1 text-center text-xl font-semibold tabular-nums",
          hasVoted
            ? "bg-primary text-white"
            : "border-2 border-dashed border-border bg-card text-muted-foreground"
        )}
      >
        {faceUp ? (
          value
        ) : hasVoted ? (
          // Face-down card: a back, not a blank. Deliberately carries no value.
          <span
            className="size-6 rotate-45 rounded-[3px] border-2 border-white/40"
            aria-hidden="true"
          />
        ) : (
          <span className="flex gap-0.5" aria-hidden="true">
            <span className="size-1.5 rounded-full bg-current" />
            <span className="size-1.5 rounded-full bg-current" />
            <span className="size-1.5 rounded-full bg-current" />
          </span>
        )}
      </div>

      <span className="flex min-w-0 max-w-28 items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[0.625rem] font-bold text-primary">
          {seat.initials}
        </span>
        <span className="truncate">
          {seat.isMe ? "You" : seat.displayName.split(" ")[0]}
        </span>
      </span>

      <span className="sr-only">
        {faceUp
          ? `${seat.displayName} voted ${value}`
          : hasVoted
            ? `${seat.displayName} has voted — card hidden until the round closes`
            : `${seat.displayName} is still choosing`}
      </span>
    </div>
  )
}

export { Seat }
