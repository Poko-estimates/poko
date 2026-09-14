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
  online,
  optimisticVote,
  revealed,
  seat,
}: {
  /** Has this person got the room open right now? Presence, not membership. */
  online: boolean
  /** Only passed for your own seat, so a card you just played shows instantly. */
  optimisticVote?: string | null
  revealed: boolean
  seat: SeatModel
}) {
  const pending = optimisticVote !== undefined
  const value = pending ? optimisticVote : seat.value
  const hasVoted = pending ? optimisticVote !== null : seat.hasVoted
  const faceUp = hasVoted && value !== null && (revealed || seat.isMe)

  // Presence only matters while a round is live: it tells you whether the
  // person you're waiting on is actually there. Once the cards are face up
  // there is nobody left to wait for, so who still has a tab open is noise.
  const showPresence = !revealed

  const who = seat.isMe ? "You" : seat.displayName
  const verb = seat.isMe ? "are" : "is"
  const description = [
    showPresence && `${who} ${verb} ${online ? "online" : "away"}`,
    faceUp
      ? `${who} played ${value}`
      : hasVoted
        ? `${who} ${seat.isMe ? "have" : "has"} a card down, hidden until the round closes`
        : `${who} ${verb} still choosing`,
  ]
    .filter(Boolean)
    .join(". ")

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
        <span className="relative flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[0.625rem] font-bold text-primary">
          {seat.initials}
          {/* Rendered for every seat in a live round, not only the present
              ones, so an away player reads as away rather than as a seat that
              forgot to draw a dot. */}
          {showPresence && (
            <span
              className={cn(
                "absolute -right-0.5 -bottom-0.5 size-2 rounded-full ring-2 ring-card",
                online ? "bg-success" : "bg-destructive"
              )}
              aria-hidden="true"
            />
          )}
        </span>
        <span className="truncate">
          {seat.isMe ? "You" : seat.displayName.split(" ")[0]}
        </span>
      </span>

      {/* The card face and the dot are both decorative, so everything they
          convey has to be available in words. */}
      <span className="sr-only">{`${description}.`}</span>
    </div>
  )
}

export { Seat }
