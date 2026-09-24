"use client"

import { useSyncExternalStore } from "react"

import {
  formatSeconds,
  getSecondsSnapshot,
  getServerSecondsSnapshot,
  subscribeToSeconds,
} from "@/lib/rooms/clock"

/** Used when there is no deadline, so the shared ticker never starts. */
const noSubscription = () => () => {}

const IDLE = { label: "--:--", remaining: null, expired: false } as const

/**
 * Counts down to an absolute deadline set by the server. Pass `null` for an
 * untimed round — the hook then subscribes to nothing at all.
 *
 * `pausedAtMs` freezes it. While the clock is held, the server deliberately
 * leaves `round_ends_at` where it was, so wall-clock time eats into it and the
 * naive subtraction would tick down to zero during a pause. Measuring against
 * the pause instant instead of `now` is what makes the display hold — and it
 * stops the shared ticker too, since a frozen number has nothing to redraw.
 *
 * Deliberately compared against the browser's own clock, with no skew
 * correction. It cannot change an outcome: the database owns the deadline —
 * `poko_votes_guard` refuses votes past `round_ends_at`, and `close_round`
 * re-checks it before honouring an expiry — so a machine with a wrong clock
 * shows a wrong number and nothing more. Correcting it would mean threading a
 * server timestamp through every render to fix something purely cosmetic.
 */
function useCountdown(deadlineMs: number | null, pausedAtMs: number | null = null) {
  const frozen = deadlineMs !== null && pausedAtMs !== null

  const nowSeconds = useSyncExternalStore<number | null>(
    deadlineMs === null || frozen ? noSubscription : subscribeToSeconds,
    getSecondsSnapshot,
    getServerSecondsSnapshot
  )

  if (deadlineMs === null) return IDLE

  // A paused clock needs no ticker and no client clock at all, so it reports
  // the same number on the server as in the browser — nothing to mismatch.
  if (frozen) {
    const held = Math.max(
      0,
      Math.ceil(deadlineMs / 1000) - Math.ceil(pausedAtMs / 1000)
    )

    return { label: formatSeconds(held), remaining: held, expired: false }
  }

  // Server render and first client paint agree on the placeholder, so there is
  // nothing for hydration to mismatch on.
  if (nowSeconds === null) return IDLE

  const remaining = Math.max(0, Math.ceil(deadlineMs / 1000) - nowSeconds)

  return {
    label: formatSeconds(remaining),
    remaining,
    expired: remaining === 0,
  }
}

export { useCountdown }
