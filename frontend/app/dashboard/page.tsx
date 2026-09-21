import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { SessionRoom } from "@/components/dashboard/session-room"
import { WelcomeToast } from "@/components/dashboard/welcome-toast"
import { AppHeader } from "@/components/site/app-header"
import { UserMenu } from "@/components/site/user-menu"
import { Container } from "@/components/site/container"
import { initialsFor } from "@/lib/account/model"
import { getRoomState, listIssues, listSprints } from "@/lib/issues/queries"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Your issues",
  description: "Your live Poko estimation rooms.",
}

export default async function Page({ searchParams }: PageProps<"/dashboard">) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  const email = typeof claims?.email === "string" ? claims.email : null
  const userId = typeof claims?.sub === "string" ? claims.sub : null

  if (!email || !userId) redirect("/login")

  const { issue, welcome } = await searchParams

  const fullName = readFullName(claims) || email.split("@")[0]

  const [issues, sprints] = await Promise.all([
    listIssues(userId),
    listSprints(userId),
  ])
  const requested = typeof issue === "string" ? issue : null
  const activeSlug =
    (requested && issues.some((row) => row.slug === requested)
      ? requested
      : issues[0]?.slug) ?? null

  const room = activeSlug ? await getRoomState(activeSlug, userId) : null

  return (
    <div className="flex flex-1 flex-col bg-surface">
      <AppHeader
        action={
          <UserMenu
            displayName={fullName}
            email={email}
            initials={initialsFor(fullName)}
          />
        }
      />

      <main className="flex-1 py-8 sm:py-12">
        <Container className="flex flex-col gap-6">
          <WelcomeToast kind={typeof welcome === "string" ? welcome : undefined} />

          <div>
            <h1 className="text-2xl leading-tight font-semibold tracking-tight text-primary sm:text-3xl">
              Good to see you, {firstNameOf(fullName)}
            </h1>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              Set up an issue, deal the deck, and get the team to a number they
              all agree on.
            </p>
          </div>

          <DashboardShell
            issues={issues}
            sprints={sprints}
            activeSlug={activeSlug}
          >
            {room && <SessionRoom room={room} />}
          </DashboardShell>
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
