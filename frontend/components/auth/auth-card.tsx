"use client"

import { useEffect, useState } from "react"

import { LoginForm } from "@/components/auth/login-form"
import { SignupForm } from "@/components/auth/signup-form"
import { cn } from "@/lib/utils"

type AuthMode = "login" | "signup"

const paths: Record<AuthMode, string> = {
  login: "/login",
  signup: "/signup",
}

const prompts = {
  login: {
    eyebrow: "New to Poko?",
    title: "Run your first session in minutes",
    body: "Create an account, invite the team and estimate a whole backlog together.",
    action: "Create account",
    target: "signup",
  },
  signup: {
    eyebrow: "Already have an account?",
    title: "Welcome back!",
    body: "Sign in to continue.",
    action: "Sign in",
    target: "login",
  },
} as const

/**
 * Login and sign-up live in one card: the navy panel slides across to uncover
 * the other form instead of navigating. The URL is kept in step with
 * `history.pushState`, which Next's router picks up without a server round trip.
 */
function AuthCard({ mode: initialMode }: { mode: AuthMode }) {
  const [mode, setMode] = useState<AuthMode>(initialMode)

  useEffect(() => {
    function syncWithLocation() {
      setMode(
        window.location.pathname === paths.signup ? "signup" : "login"
      )
    }

    window.addEventListener("popstate", syncWithLocation)
    return () => window.removeEventListener("popstate", syncWithLocation)
  }, [])

  function switchTo(next: AuthMode) {
    if (next === mode) return
    setMode(next)
    window.history.pushState(null, "", paths[next])
  }

  const showingLogin = mode === "login"

  return (
    <div className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-border/70 bg-card shadow-[0_45px_90px_-45px_rgba(20,33,61,0.55)]">
      <div className="grid md:grid-cols-2">
        <FormPane active={showingLogin}>
          <LoginForm />
        </FormPane>
        <FormPane active={!showingLogin} side="end">
          <SignupForm />
        </FormPane>
      </div>

      <SwitchPanel mode={mode} onSwitch={switchTo} />
    </div>
  )
}

/**
 * Both panes render on desktop and share the grid row, so the card is as tall
 * as the taller form and the sliding panel simply covers the inactive half.
 */
function FormPane({
  active,
  side = "start",
  children,
}: {
  active: boolean
  side?: "start" | "end"
  children: React.ReactNode
}) {
  return (
    <div
      inert={!active}
      className={cn(
        "col-start-1 row-start-1 flex flex-col justify-center px-6 py-10 sm:px-10 md:py-14",
        side === "end" && "md:col-start-2",
        active ? "flex" : "hidden md:flex"
      )}
    >
      <div className="mx-auto w-full max-w-sm">{children}</div>
    </div>
  )
}

function SwitchPanel({
  mode,
  onSwitch,
}: {
  mode: AuthMode
  onSwitch: (mode: AuthMode) => void
}) {
  return (
    <div
      className={cn(
        "relative z-10 md:absolute md:inset-y-0 md:left-0 md:w-1/2",
        "md:transition-transform md:duration-700 md:ease-[cubic-bezier(0.76,0,0.24,1)] motion-reduce:md:transition-none",
        mode === "login" ? "md:translate-x-full" : "md:translate-x-0"
      )}
    >
      <div className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-primary px-6 py-10 text-center text-white sm:px-10">
        <PanelDecor />
        <PanelPrompt active={mode === "login"} {...prompts.login} onSwitch={onSwitch} />
        <PanelPrompt active={mode === "signup"} {...prompts.signup} onSwitch={onSwitch} />
      </div>
    </div>
  )
}

function PanelPrompt({
  active,
  eyebrow,
  title,
  body,
  action,
  target,
  onSwitch,
}: (typeof prompts)[AuthMode] & {
  active: boolean
  onSwitch: (mode: AuthMode) => void
}) {
  return (
    <div
      inert={!active}
      className={cn(
        "relative z-10 w-full max-w-sm flex-col items-center gap-4",
        "transition-[opacity,transform] ease-out motion-reduce:transition-none",
        "md:absolute md:inset-0 md:max-w-none md:justify-center md:px-10",
        active
          ? "flex md:translate-y-0 md:opacity-100 md:delay-[380ms] md:duration-300"
          : "hidden md:flex md:translate-y-3 md:opacity-0 md:duration-150"
      )}
    >
      <p className="text-xs font-semibold tracking-[0.14em] text-secondary uppercase">
        {eyebrow}
      </p>
      <h2 className="text-xl leading-tight font-semibold tracking-tight text-balance sm:text-2xl md:text-3xl">
        {title}
      </h2>
      <p className="hidden text-sm leading-relaxed text-white/70 md:block">
        {body}
      </p>
      <button
        type="button"
        onClick={() => onSwitch(target)}
        className="mt-2 inline-flex h-11 items-center justify-center rounded-full border border-white/45 px-8 text-sm font-semibold tracking-[0.08em] uppercase transition-colors outline-none hover:border-white hover:bg-white hover:text-primary focus-visible:ring-3 focus-visible:ring-secondary/60 active:translate-y-px"
      >
        {action}
      </button>
    </div>
  )
}

/** Soft glow and two offset estimation cards, echoing the Poko mark. */
function PanelDecor() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 hidden md:block"
    >
      <div className="absolute -bottom-8 right-24 h-32 w-22 -rotate-12 rounded-2xl border border-white/10 bg-white/5" />
      <div className="absolute -right-6 -bottom-12 h-32 w-22 rotate-6 rounded-2xl border border-white/12 bg-white/5" />
    </div>
  )
}

export { AuthCard }
export type { AuthMode }
