"use client"

import { useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

/**
 * Collapses a burst of realtime events into a single server re-read.
 *
 * Eight people voting at once produces eight broadcasts within a few hundred
 * milliseconds; without this that would be eight round trips all rendering the
 * same result.
 *
 * Plain `useCallback` rather than `useEffectEvent`: an Effect Event may only be
 * called from an Effect in the component that created it and must never be
 * returned or passed along, which is exactly what a hook like this does. There
 * is nothing to capture anyway — `router` is stable and `ms` is a constant.
 */
function useCoalescedRefresh(ms = 120) {
  const router = useRouter()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup only. Nothing is set here, so there is no state-in-effect to trip.
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  // The ref is only ever touched inside callbacks, never during render.
  return useCallback(() => {
    if (timer.current) clearTimeout(timer.current)

    timer.current = setTimeout(() => {
      timer.current = null
      router.refresh()
    }, ms)
  }, [ms, router])
}

export { useCoalescedRefresh }
