import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { SessionRoom } from "@/components/dashboard/session-room"
import { SignOutButton } from "@/components/dashboard/sign-out-button"
import { WelcomeAlert } from "@/components/dashboard/welcome-alert"
import { Container } from "@/components/site/container"
import { Logo } from "@/components/site/logo"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Your session",
  description: "Your live Poko estimation room.",
}

export default async function Page({ searchParams }: PageProps<"/dashboard">) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  const email = typeof claims?.email === "string" ? claims.email : null

  // The proxy already guards this route; this keeps the page correct on its own.
  if (!email) redirect("/login")

  const { welcome } = await searchParams
  // Falls back to the email handle for accounts created before names were
  // collected. Display only — never an authorization signal.
  const fullName = readFullName(claims) || email.split("@")[0]

  return (
    <div className="flex flex-1 flex-col bg-surface">
      <header className="border-b border-border bg-background">
        <Container className="flex h-16 items-center justify-between gap-4">
          <Logo />
          <div className="flex items-center gap-3">
            <span className="hidden max-w-56 truncate text-sm text-muted-foreground sm:block">
              {email}
            </span>
            <SignOutButton />
          </div>
        </Container>
      </header>

      <main className="flex-1 py-8 sm:py-12">
        <Container className="flex flex-col gap-6">
          <WelcomeAlert kind={typeof welcome === "string" ? welcome : undefined} />

          <div>
            <h1 className="text-2xl leading-tight font-semibold tracking-tight text-primary sm:text-3xl">
              Good to see you, {firstNameOf(fullName)}
            </h1>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              Your room is open and the next story is on the table. Pick a card
              — the rest of the team is waiting on you.
            </p>
          </div>

          <SessionRoom
            displayName={fullName}
            initials={initialsFor(fullName)}
          />
        </Container>
      </main>
    </div>
  )
}

/** The name captured at sign-up, if this account has one. */
function readFullName(claims: Record<string, unknown> | undefined) {
  const metadata = claims?.user_metadata
  if (typeof metadata !== "object" || metadata === null) return ""

  const fullName = (metadata as Record<string, unknown>).full_name
  return typeof fullName === "string" ? fullName.trim() : ""
}

function firstNameOf(name: string) {
  return name.split(/\s+/)[0]
}

/** Two-letter seat label: "Jane Doe" -> "JD", "jane.doe" -> "JD". */
function initialsFor(name: string) {
  const parts = name.split(/[\s.\-_+]/).filter(Boolean)
  const letters =
    parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2)

  return letters.toUpperCase()
}
