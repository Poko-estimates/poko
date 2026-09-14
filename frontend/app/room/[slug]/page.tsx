import type { Metadata } from "next"
import Link from "next/link"

import { SessionRoom } from "@/components/dashboard/session-room"
import { SignOutButton } from "@/components/dashboard/sign-out-button"
import { JoinCard } from "@/components/room/join-card"
import { AppHeader } from "@/components/site/app-header"
import { Container } from "@/components/site/container"
import { buttonVariants } from "@/components/ui/button"
import { getRoomState } from "@/lib/games/queries"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Join the game",
  description: "Estimate with your team in a live Poko room.",
}

export default async function Page({ params }: PageProps<"/room/[slug]">) {
  const { slug } = await params

  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  const userId = typeof claims?.sub === "string" ? claims.sub : null
  const isGuest = claims?.is_anonymous === true

  // Null covers both "you aren't seated here" and "no such game": RLS makes
  // them indistinguishable on purpose, so neither the page nor a visitor can
  // use this route to discover which slugs exist.
  const room = userId ? await getRoomState(slug, userId) : null
  const displayName = room?.me?.displayName ?? readDisplayName(claims)

  return (
    <div className="flex flex-1 flex-col bg-surface">
      <AppHeader
        label={room ? displayName : null}
        action={
          room &&
          (isGuest ? (
            <Link
              href="/signup"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Save your games
            </Link>
          ) : (
            <SignOutButton />
          ))
        }
      />

      <main className="flex-1 py-8 sm:py-12">
        <Container>
          {room ? <SessionRoom room={room} /> : (
            <JoinCard
              slug={slug}
              signedIn={Boolean(claims)}
              suggestedName={displayName}
            />
          )}
        </Container>
      </main>
    </div>
  )
}

/**
 * A name to pre-fill the join form with. Display only — user metadata is
 * editable by the user it belongs to, so it must never inform a decision about
 * access.
 */
function readDisplayName(claims: Record<string, unknown> | undefined) {
  const metadata = claims?.user_metadata
  if (typeof metadata === "object" && metadata !== null) {
    const fullName = (metadata as Record<string, unknown>).full_name
    if (typeof fullName === "string" && fullName.trim()) return fullName.trim()
  }

  const email = claims?.email
  return typeof email === "string" ? email.split("@")[0] : ""
}
