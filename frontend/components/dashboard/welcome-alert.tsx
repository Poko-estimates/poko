"use client"

import { useState } from "react"
import { CheckCircle2, X } from "lucide-react"

const messages = {
  signin: "You're signed in. Welcome back.",
  signup: "Account created — you're signed in and ready to estimate.",
  reset: "Password updated. You're signed in with the new one.",
} as const

type Welcome = keyof typeof messages

function isWelcome(value: string | undefined): value is Welcome {
  return value !== undefined && value in messages
}

/** Success banner shown once after an auth redirect, dismissible by the user. */
function WelcomeAlert({ kind }: { kind: string | undefined }) {
  const [dismissed, setDismissed] = useState(false)

  if (!isWelcome(kind) || dismissed) return null

  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-2xl border border-secondary/40 bg-secondary/12 px-4 py-3.5 text-sm text-primary"
    >
      <CheckCircle2 className="mt-0.5 size-4.5 shrink-0 text-secondary" aria-hidden="true" />
      <p className="flex-1 leading-relaxed font-medium">{messages[kind]}</p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="-my-1 -mr-1 inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors outline-none hover:bg-primary/5 hover:text-primary focus-visible:ring-3 focus-visible:ring-secondary/50"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}

export { WelcomeAlert }
