import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  EyeOff,
  Handshake,
  Link2,
  Timer,
  Users,
} from "lucide-react"

import { Container } from "@/components/site/container"
import { Footer } from "@/components/site/footer"
import { NavBar } from "@/components/site/navbar"
import { Reveal } from "@/components/site/reveal"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "About",
  description:
    "Poko is planning poker for agile teams: blind voting the database enforces, one shared reveal, and an estimate only when the team actually agrees.",
}

/**
 * What the product refuses to do, and why.
 *
 * Every one of these is a rule the database enforces rather than a habit the
 * interface encourages — which is the honest reason they are worth putting on
 * a page. Nothing here is aspirational: if one of them stops being true, a
 * pgTAP assertion fails.
 */
const principles = [
  {
    icon: EyeOff,
    title: "Blind by construction",
    body: "Until a round closes, your card is readable by you and nobody else. That is not the screen hiding it — row-level security refuses to hand it over, so there is no request anyone can send that leaks the table early.",
  },
  {
    icon: Handshake,
    title: "One reveal, for everyone",
    body: "Cards turn over in a single moment, broadcast to every seat at once. Nobody sees the spread a beat before anyone else, which is what makes the first reaction an honest one.",
  },
  {
    icon: Users,
    title: "Unanimous or nothing",
    body: "An estimate is recorded only when every card matches. Poko will not average a 3 and an 8 into a 5 that nobody argued for — a split vote is a prompt to talk, and it says so.",
  },
  {
    icon: Timer,
    title: "The clock is real",
    body: "A timebox is enforced where the votes land, not in the browser. When the round expires it is genuinely over, even for the tab whose countdown is running slow.",
  },
]

/** Who the shape of the product is actually for. */
const audiences = [
  {
    title: "Scrum and kanban teams",
    body: "Refinement sessions where the point is agreeing a number, together, and getting back to the work.",
  },
  {
    title: "Teams spread across time zones",
    body: "Everything runs in the browser over a shared link. Guests need no account, so nobody is blocked at the door.",
  },
  {
    title: "Anyone tired of anchoring",
    body: "If your estimates quietly track whoever spoke first, blind voting is the fix — and it has to be enforced to count.",
  },
]

export default function Page() {
  return (
    <>
      <NavBar />

      <main className="flex-1">
        {/* Dark band, matching the home hero: this is the page that says what
            the product is, so it should carry the same weight. */}
        <section className="bg-primary text-white">
          <Container className="py-20 sm:py-24">
            <Reveal className="max-w-3xl">
              <p className="text-sm font-semibold tracking-wide text-secondary uppercase">
                About
              </p>
              <h1 className="mt-4 text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">
                Estimation that the loudest voice in the room can&apos;t decide
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-white/70">
                Poko is planning poker for agile teams. Everyone lays a card
                face down, the table turns over at once, and the number only
                sticks when the team actually agrees on it.
              </p>
            </Reveal>
          </Container>
        </section>

        {/* The plain-language description. Prose rather than feature bullets:
            somebody landing here wants to know what the thing IS. */}
        <section className="border-b border-border bg-background py-16 sm:py-20">
          <Container>
            <Reveal className="grid gap-10 lg:grid-cols-[minmax(0,0.6fr)_minmax(0,1fr)] lg:gap-16">
              <h2 className="text-2xl leading-tight font-semibold tracking-tight text-primary text-balance sm:text-3xl">
                What Poko is
              </h2>

              <div className="flex max-w-2xl flex-col gap-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
                <p>
                  Planning poker is a simple idea: to estimate a piece of work,
                  everyone commits to a number privately, and then you compare.
                  Where the numbers differ, someone knows something the others
                  don&apos;t, and that conversation is the real value of the
                  exercise. The estimate is almost a side effect.
                </p>
                <p>
                  It falls apart when the privacy is only a convention. If the
                  first number said out loud shapes every number after it, the
                  team has held a meeting to confirm one person&apos;s guess.
                  Most tools leave that to good manners.{" "}
                  <span className="font-medium text-primary">
                    Poko makes it a rule the database keeps.
                  </span>
                </p>
                <p>
                  You create an issue, pick a deck, and share a link. Your team
                  joins from the browser, plays a card each, and the round
                  closes on your word or on the clock. Issues group into the
                  sprint you&apos;re refining, so a session reads as one list
                  rather than a pile of one-off rooms.
                </p>
              </div>
            </Reveal>
          </Container>
        </section>

        <section className="bg-surface py-16 sm:py-20">
          <Container>
            <Reveal className="max-w-2xl">
              <h2 className="text-2xl leading-tight font-semibold tracking-tight text-primary text-balance sm:text-3xl">
                What it refuses to do
              </h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Four rules the product is built around. Each is enforced where
                the data lives, so none of them depends on the interface
                behaving.
              </p>
            </Reveal>

            <div className="mt-12 grid gap-5 sm:grid-cols-2">
              {principles.map((principle) => (
                <Reveal
                  key={principle.title}
                  className="flex flex-col rounded-3xl border border-border bg-card p-6 transition-colors hover:border-secondary/50 sm:p-7"
                >
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-secondary/15 text-secondary">
                    <principle.icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold tracking-tight text-primary">
                    {principle.title}
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                    {principle.body}
                  </p>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>

        <section className="border-y border-border bg-background py-16 sm:py-20">
          <Container>
            <Reveal className="max-w-2xl">
              <h2 className="text-2xl leading-tight font-semibold tracking-tight text-primary text-balance sm:text-3xl">
                Who it&apos;s for
              </h2>
            </Reveal>

            <div className="mt-10 grid gap-8 md:grid-cols-3 md:gap-10">
              {audiences.map((audience) => (
                <Reveal key={audience.title} className="border-t border-border pt-6">
                  <h3 className="text-base font-semibold tracking-tight text-primary">
                    {audience.title}
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                    {audience.body}
                  </p>
                </Reveal>
              ))}
            </div>

            <Reveal className="mt-12 flex items-start gap-3 rounded-2xl border border-dashed border-border px-5 py-5">
              <Link2
                className="mt-0.5 size-4 shrink-0 text-secondary"
                aria-hidden="true"
              />
              <p className="text-sm leading-relaxed text-muted-foreground">
                Guests join a room from the invite link without making an
                account. An account is only needed to create issues and keep
                them between sessions.
              </p>
            </Reveal>
          </Container>
        </section>

        <section className="bg-background py-16 sm:py-20">
          <Container>
            <Reveal className="relative isolate overflow-hidden rounded-3xl bg-primary px-6 py-14 text-center sm:px-16">
              <div className="relative mx-auto max-w-2xl">
                <h2 className="text-2xl leading-tight font-semibold tracking-tight text-white text-balance sm:text-3xl">
                  Point your next story with the room, not the loudest voice
                </h2>
                <p className="mt-4 leading-relaxed text-white/70">
                  Set up an issue, share the link, and see how a blind round
                  changes the conversation.
                </p>

                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                  <Link
                    href="/signup"
                    className={cn(
                      buttonVariants({ variant: "secondary", size: "xl" }),
                      "justify-center hover:-translate-y-0.5"
                    )}
                  >
                    Get started free
                    <ArrowRight
                      className="size-4 transition-transform group-hover/button:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </Link>
                  <Link
                    href="/contact"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "xl" }),
                      "justify-center border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
                    )}
                  >
                    Talk to us
                  </Link>
                </div>
              </div>
            </Reveal>
          </Container>
        </section>
      </main>

      <Footer />
    </>
  )
}
