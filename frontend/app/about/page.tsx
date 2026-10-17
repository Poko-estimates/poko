import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Link2 } from "lucide-react"

import { Container } from "@/components/site/container"
import { Footer } from "@/components/site/footer"
import { NavBar } from "@/components/site/navbar"
import { Reveal } from "@/components/site/reveal"
import { buttonVariants } from "@/components/ui/button"
import { contactMailto } from "@/lib/legal/entity"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "About",
  description:
    "Poko is planning poker for agile teams: blind voting the database enforces, one shared reveal, and an estimate only when the team agrees.",
}

/**
 * The whole product in four lines. Deliberately one sentence each — someone
 * who reads only this should be able to picture a session.
 */
const steps = [
  {
    title: "Open a room",
    body: "Name the story, pick a deck, share one link. Guests join from the browser.",
  },
  {
    title: "Everyone votes blind",
    body: "Your card is readable by you and nobody else — the database refuses to hand it over early, so it is a rule rather than a habit.",
  },
  {
    title: "Reveal together",
    body: "Cards turn over in a single moment, for every seat at once. Nobody sees the spread a beat early.",
  },
  {
    title: "Agree, or talk",
    body: "Matching cards record the estimate. A split one is a prompt to discuss, never an average nobody argued for.",
  },
]

/** Who the shape of the product is actually for. */
const audiences = [
  {
    title: "Scrum and kanban teams",
    body: "Refinement where the point is agreeing a number and getting back to the work.",
  },
  {
    title: "Teams across time zones",
    body: "Runs in the browser over a shared link. Guests need no account.",
  },
  {
    title: "Anyone tired of anchoring",
    body: "If your estimates track whoever spoke first, blind voting is the fix.",
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
                Everyone lays a card face down, the table turns over at once,
                and the number only sticks when the team agrees.
              </p>
            </Reveal>
          </Container>
        </section>

        <section className="border-b border-border bg-background py-16 sm:py-20">
          <Container>
            <Reveal className="grid gap-10 lg:grid-cols-[minmax(0,0.6fr)_minmax(0,1fr)] lg:gap-16">
              <h2 className="text-2xl leading-tight font-semibold tracking-tight text-primary text-balance sm:text-3xl">
                What Poko is
              </h2>

              <div className="flex max-w-2xl flex-col gap-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
                <p>
                  Planning poker is simple: everyone commits to a number
                  privately, then you compare. Where the numbers differ,
                  someone knows something the others don&apos;t — and that
                  conversation is the point.
                </p>
                <p>
                  That only works if the cards are really hidden. In most tools
                  they are hidden by agreement: everyone is trusted not to
                  peek, and one number said out loud sways the rest.{" "}
                  <span className="font-medium text-primary">
                    Poko does not rely on trust. Nobody can see your card until
                    the round ends — not even the person who set up the room.
                  </span>
                </p>
              </div>
            </Reveal>
          </Container>
        </section>

        <section className="border-b border-border bg-surface py-16 sm:py-20">
          <Container>
            <Reveal className="max-w-2xl">
              <h2 className="text-2xl leading-tight font-semibold tracking-tight text-primary text-balance sm:text-3xl">
                How a round works
              </h2>
            </Reveal>

            <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:gap-8">
              {steps.map((step, index) => (
                <Reveal
                  as="li"
                  key={step.title}
                  delay={index * 90}
                  className="flex gap-4 rounded-3xl border border-border bg-card p-6"
                >
                  <span
                    aria-hidden="true"
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-sm font-semibold text-secondary tabular-nums"
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold tracking-tight text-primary">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {step.body}
                    </p>
                  </div>
                </Reveal>
              ))}
            </ol>
          </Container>
        </section>

        <section className="border-b border-border bg-background py-16 sm:py-20">
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
                Guests join from the invite link without an account. You only
                need one to create issues and keep them between sessions.
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
                  <a
                    href={contactMailto}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "xl" }),
                      "justify-center border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
                    )}
                  >
                    Talk to us
                  </a>
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
