"use client"

import { useEffect, useEffectEvent, useRef } from "react"
import { Pause, Timer } from "lucide-react"

import { useCountdown } from "@/lib/rooms/use-countdown"
import { cn } from "@/lib/utils"

/**
 * The round's countdown, kept in its own component on purpose: it re-renders
 * once a second, and nothing else in the room should redraw at that rate.
 * An untimed round never renders this, so the ticker never even starts.
 */
function RoundTimer({
  deadline,
  onExpire,
  pausedAt = null,
}: {
  /** ISO timestamp from the server — `issues.round_ends_at`. */
  deadline: string
  onExpire?: () => void
  /** ISO timestamp from `issues.round_paused_at`, or null while running. */
  pausedAt?: string | null
}) {
  const paused = pausedAt !== null
  const { expired, label, remaining } = useCountdown(
    Date.parse(deadline),
    paused ? Date.parse(pausedAt) : null
  )

  // Which deadline we've already reported, so reopening — or resuming, which
  // moves the deadline — starts a fresh watch rather than being treated as
  // already-fired.
  const firedFor = useRef<string | null>(null)
  const notify = useEffectEvent(() => onExpire?.())

  useEffect(() => {
    // A held clock must never close the round. `useCountdown` already refuses
    // to report a paused clock as expired; this is the second lock, because
    // auto-closing a round the facilitator deliberately paused would be the
    // worst possible bug in this component.
    if (paused || !expired || firedFor.current === deadline) return

    firedFor.current = deadline
    notify()
  }, [deadline, expired, paused])

  // Under a minute is the point where people start watching the clock.
  const urgent = !paused && remaining !== null && remaining <= 60 && !expired

  return (
    <span
      role="timer"
      aria-label={
        paused
          ? `Clock paused with ${label} left`
          : expired
            ? "Time is up"
            : `${label} left in this round`
      }
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 font-mono text-xs font-medium tabular-nums transition-colors",
        paused
          ? "border-dashed border-border text-muted-foreground"
          : expired
            ? "border-destructive/40 bg-destructive/10 text-destructive"
            : urgent
              ? "border-secondary bg-secondary/15 text-primary"
              : "border-border text-primary"
      )}
    >
      {paused ? (
        <Pause className="size-3.5" aria-hidden="true" />
      ) : (
        <Timer
          className={cn(
            "size-3.5",
            expired ? "text-destructive" : "text-secondary"
          )}
          aria-hidden="true"
        />
      )}
      {paused ? label : expired ? "Time's up" : label}
    </span>
  )
}

export { RoundTimer }
