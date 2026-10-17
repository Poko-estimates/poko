"use client"

import { useEffect, useEffectEvent, useState } from "react"

import { roomEvents, type RoomEvent } from "@/lib/rooms/events"
import { createClient } from "@/lib/supabase/client"

const EMPTY: ReadonlySet<string> = new Set()

/**
 * Subscribes to one issue's private channel.
 *
 * Events carry no authoritative data — they are a nudge to re-read from the
 * server. That is deliberate: a broadcast payload is identical for every
 * subscriber and is NOT filtered by row-level security, so if the client
 * merged payloads into its own copy of the room, one convenience field in a
 * trigger would end blind voting silently. Re-reading means card values only
 * ever arrive through an RLS-checked query.
 *
 * Returns the set of user ids with the room currently open. Presence is for
 * showing who is around and nothing else — a seat, not a socket, is what makes
 * someone a player, and the auto-close count comes from the seat table.
 */
function useRoomChannel({
  issueId,
  onEvent,
  userId,
}: {
  issueId: string
  /**
   * Called for every inbound event. Treat it as a nudge to re-read from the
   * server; the `type` is there so a caller can additionally react to a
   * specific moment, like the round closing.
   */
  onEvent: (event: RoomEvent) => void
  userId: string
}): ReadonlySet<string> {
  // The one genuinely client-owned piece of state: the server cannot see who
  // has a tab open. Setting it from a subscription callback is the pattern the
  // set-state-in-effect rule explicitly endorses; what it forbids is syncing
  // props into state, which this design has no need to do.
  const [online, setOnline] = useState<ReadonlySet<string>>(EMPTY)

  // Gives the subscription a stable handle that always sees the latest
  // callback, so the channel isn't torn down and rebuilt on every render.
  const handleEvent = useEffectEvent(onEvent)

  useEffect(() => {
    // createBrowserClient returns a per-origin singleton, so this reuses the
    // existing connection rather than opening a second websocket.
    const supabase = createClient()

    // Do NOT call supabase.realtime.setAuth() here. supabase-js already hands
    // the realtime client an accessToken callback and re-sets it on
    // TOKEN_REFRESHED / SIGNED_IN / INITIAL_SESSION. Calling it by hand puts
    // the client into manual-token mode, and the channel would then die
    // silently about an hour in, when the JWT first expires.
    const channel = supabase.channel(`issue:${issueId}`, {
      config: { private: true, presence: { key: userId } },
    })

    for (const type of roomEvents) {
      channel.on("broadcast", { event: type }, ({ payload }) => {
        handleEvent({ type, payload: (payload ?? {}) as Record<string, unknown> })
      })
    }

    channel
      .on("presence", { event: "sync" }, () => {
        setOnline(new Set(Object.keys(channel.presenceState())))
      })
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") return

        // A dropped socket loses messages silently, so reconcile on every
        // (re)connect rather than trusting the stream to be complete. Sent as
        // issue_updated because it is a plain "re-read", not a moment worth
        // announcing — a reconnect must not replay a celebration.
        handleEvent({ type: "issue_updated", payload: {} })
        void channel.track({ userId })
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [issueId, userId])

  return online
}

export { useRoomChannel }
