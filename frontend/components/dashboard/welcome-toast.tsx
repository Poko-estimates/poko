"use client"

import { useEffect, useEffectEvent, useRef } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { useToast } from "@/components/ui/toast"

const messages = {
  signin: "You're signed in. Welcome back.",
  signup: "Account created — you're signed in and ready to estimate.",
  reset: "Password updated. You're signed in with the new one.",
} as const

type Welcome = keyof typeof messages

function isWelcome(value: string | undefined): value is Welcome {
  return value !== undefined && value in messages
}

/**
 * Turns the `?welcome=` marker an auth redirect leaves behind into a toast.
 *
 * Renders nothing itself. It also strips the parameter from the URL, which is
 * what stops the greeting repeating: without that, every `router.refresh()` —
 * and realtime triggers plenty of those — would re-raise it, and so would a
 * reload hours later.
 */
function WelcomeToast({ kind }: { kind: string | undefined }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const toast = useToast()

  // Which greeting we've already raised.
  //
  // Strict Mode runs effects twice in development — mount, clean up, mount
  // again — which without this shows the greeting twice. Refs survive that
  // simulated remount, so the guard holds. It also covers the real case of the
  // component remounting for any other reason.
  const greeted = useRef<Welcome | null>(null)

  const greet = useEffectEvent((welcome: Welcome) => {
    toast.add({ type: "success", title: messages[welcome] })

    // Preserve everything except the marker, so an open game stays open.
    const next = new URLSearchParams(searchParams)
    next.delete("welcome")
    const query = next.toString()

    router.replace(query ? `${pathname}?${query}` : pathname)
  })

  useEffect(() => {
    if (!isWelcome(kind) || greeted.current === kind) return

    greeted.current = kind
    greet(kind)
  }, [kind])

  return null
}

export { WelcomeToast }
