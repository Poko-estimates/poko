"use client"

import { useSyncExternalStore } from "react"

import {
  getSecondsSnapshot,
  getServerSecondsSnapshot,
  subscribeToSeconds,
} from "@/lib/rooms/clock"

/**
 * Counts down to an absolute deadline set by the server.
 *
 * Deliberately compared against the browser's own clock, with no skew
 * correction. It cannot change an outcome: the database owns the deadline —
 * `poko_votes_guard` refuses votes past `round_ends_at`, and `close_round`
 * re-checks it before honouring an expiry — so a machine with a wrong clock
 * shows a wrong number and nothing more. Correcting it would mean threading a
 * server timestamp through every render to fix something purely cosmetic.
 */
function useCountdown(deadlineMs: number) {
  const nowSeconds = useSyncExternalStore<number | null>(
    subscribeToSeconds,
    getSecondsSnapshot,
    getServerSecondsSnapshot
  )

  // Server render and first client paint agree on the placeholder, so there is
  // nothing for hydration to mismatch on.
  if (nowSeconds === null) {
    return { label: "--:--", remaining: null, expired: false }
  }

  const remaining = Math.max(0, Math.ceil(deadlineMs / 1000) - nowSeconds)

  return { label: format(remaining), remaining, expired: remaining === 0 }
}

/** 90 -> "1:30", 5 -> "0:05". */
function format(seconds: number) {
  const minutes = Math.floor(seconds / 60)

  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`
}

export { useCountdown }
