import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { SessionRoom } from "@/components/dashboard/session-room"
import { SignOutButton } from "@/components/dashboard/sign-out-button"
import { WelcomeAlert } from "@/components/dashboard/welcome-alert"
import { AppHeader } from "@/components/site/app-header"
import { Container } from "@/components/site/container"
import { getRoomState, listGames } from "@/lib/games/queries"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Your games",
  description: "Your live Poko estimation rooms.",
}

export default async function Page({ searchParams }: PageProps<"/dashboard">) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  const email = typeof claims?.email === "string" ? claims.email : null
  const userId = typeof claims?.sub === "string" ? claims.sub : null

  if (!email || !userId) redirect("/login")

  const { game, welcome } = await searchParams

  const fullName = readFullName(claims) || email.split("@")[0]

  const games = await listGames()
  const requested = typeof game === "string" ? game : null
  const activeSlug =
    (requested && games.some((row) => row.slug === requested)
      ? requested
      : games[0]?.slug) ?? null

  const room = activeSlug ? await getRoomState(activeSlug, userId) : null

  return (
    <div className="flex flex-1 flex-col bg-surface">
      <AppHeader label={email} action={<SignOutButton />} />

      <main className="flex-1 py-8 sm:py-12">
        <Container className="flex flex-col gap-6">
          <WelcomeAlert kind={typeof welcome === "string" ? welcome : undefined} />

          <div>
            <h1 className="text-2xl leading-tight font-semibold tracking-tight text-primary sm:text-3xl">
              Good to see you, {firstNameOf(fullName)}
            </h1>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              Set up a game, deal the deck, and get the team to a number they
              all agree on.
            </p>
          </div>

          <DashboardShell games={games} activeSlug={activeSlug}>
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
