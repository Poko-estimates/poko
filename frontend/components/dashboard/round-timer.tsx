"use client"

import { useEffect, useEffectEvent, useRef } from "react"
import { Timer } from "lucide-react"

import { useCountdown } from "@/lib/rooms/use-countdown"
import { cn } from "@/lib/utils"

/**
 * The round's countdown, kept in its own component on purpose: it re-renders
 * once a second, and nothing else in the room should redraw at that rate.
 * A game with no timebox never renders this, so the ticker never even starts.
 */
function RoundTimer({
  deadline,
  onExpire,
}: {
  /** ISO timestamp from the server — `games.round_ends_at`. */
  deadline: string
  onExpire?: () => void
}) {
  const { expired, label, remaining } = useCountdown(Date.parse(deadline))

  // Which deadline we've already reported, so reopening starts a fresh round
  // rather than being treated as already-fired.
  const firedFor = useRef<string | null>(null)
  const notify = useEffectEvent(() => onExpire?.())

  useEffect(() => {
    if (!expired || firedFor.current === deadline) return

    firedFor.current = deadline
    notify()
  }, [deadline, expired])

  // Under a minute is the point where people start watching the clock.
  const urgent = remaining !== null && remaining <= 60 && !expired

  return (
    <span
      role="timer"
      aria-label={
        expired ? "Time is up" : `${label} left in this round`
      }
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 font-mono text-xs font-medium tabular-nums transition-colors",
        expired
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : urgent
            ? "border-secondary bg-secondary/15 text-primary"
            : "border-border text-primary"
      )}
    >
      <Timer
        className={cn(
          "size-3.5",
          expired ? "text-destructive" : "text-secondary"
        )}
        aria-hidden="true"
      />
      {expired ? "Time's up" : label}
    </span>
  )
}

export { RoundTimer }
