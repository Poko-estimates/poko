import type { Metadata } from "next"
import Link from "next/link"
import { Bug, Lightbulb, Mail, MessagesSquare } from "lucide-react"

import { Container } from "@/components/site/container"
import { Footer } from "@/components/site/footer"
import { NavBar } from "@/components/site/navbar"
import { Reveal } from "@/components/site/reveal"
import { buttonVariants } from "@/components/ui/button"
import { entity } from "@/lib/legal/entity"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Send the Poko team feedback, a bug report, or anything else about planning poker and estimation. Write to us directly — there is no form in the way.",
}

/**
 * The mailto the button opens, with the subject already filled in.
 *
 * URLSearchParams encodes a space as "+", which mail clients drop into the
 * subject line literally rather than rendering as a space — hence the swap to
 * %20. The body is left empty on purpose: a prefilled one reads as
 * presumptuous, and some clients truncate anything long.
 */
const mailto = `mailto:${entity.contactEmail}?${new URLSearchParams({
  subject: "Poko — hello",
})
  .toString()
  .replace(/\+/g, "%20")}`

/** What to send, so people can tell which of these they have. */
const reasons = [
  {
    icon: Lightbulb,
    title: "Feedback",
    body: "What's working, what gets in the way, and what you'd change about the way a round plays out.",
  },
  {
    icon: Bug,
    title: "Something's broken",
    body: "Tell us what you were doing and what happened instead. A room link and roughly when helps us find it.",
  },
  {
    icon: MessagesSquare,
    title: "Everything else",
    body: "Questions about the product, how your team could use it, or anything that doesn't fit the other two.",
  },
]

export default function Page() {
  return (
    <>
      <NavBar />

      <main className="flex-1">
        <section className="border-b border-border bg-surface py-16 sm:py-20">
          <Container>
            <Reveal className="max-w-2xl">
              <p className="text-sm font-semibold tracking-wide text-secondary uppercase">
                Contact
              </p>
              <h1 className="mt-3 text-3xl leading-tight font-semibold tracking-tight text-primary text-balance sm:text-4xl">
                Tell us what would make Poko better
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
                Estimation is a habit, and the tool should fit the way your team
                already works. If it doesn&apos;t, we want to hear about it —
                especially the parts that annoyed you.
              </p>
            </Reveal>
          </Container>
        </section>

        <section className="bg-background py-16 sm:py-20">
          <Container>
            <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:gap-16">
              <Reveal className="lg:pt-2">
                <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  What to send
                </h2>

                <ul className="mt-6 flex flex-col gap-7">
                  {reasons.map((reason) => (
                    <li key={reason.title} className="flex gap-4">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
                        <reason.icon className="size-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-primary">
                          {reason.title}
                        </h3>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          {reason.body}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Reveal>

              <Reveal>
                <div className="flex flex-col rounded-3xl border border-border bg-card p-6 sm:p-8">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-secondary/15 text-secondary">
                    <Mail className="size-6" aria-hidden="true" />
                  </span>

                  <h2 className="mt-5 text-xl font-semibold tracking-tight text-primary sm:text-2xl">
                    Write to us directly
                  </h2>
                  <p className="mt-3 leading-relaxed text-muted-foreground">
                    No form, no account, no ticket number. The button opens your
                    email app with the address filled in — reply to our answer
                    and the whole thread stays in one place.
                  </p>

                  <a
                    href={mailto}
                    className={cn(
                      buttonVariants({ variant: "secondary", size: "xl" }),
                      "mt-7 justify-center"
                    )}
                  >
                    <Mail className="size-4" aria-hidden="true" />
                    Email the Poko team
                  </a>

                  {/* The address in plain text as well as behind the button.
                      A mailto does nothing at all for someone reading webmail
                      in a browser tab with no desktop client configured, and
                      that is a large share of the people this page is for —
                      they need something they can copy. */}
                  <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
                    Or copy the address and write from wherever you read your
                    mail:{" "}
                    <a
                      href={`mailto:${entity.contactEmail}`}
                      className="rounded-sm font-mono font-medium text-primary underline underline-offset-4 transition-colors outline-none hover:text-secondary focus-visible:ring-3 focus-visible:ring-secondary/50"
                    >
                      {entity.contactEmail}
                    </a>
                  </p>

                  <p className="mt-6 border-t border-border pt-5 text-xs leading-relaxed text-muted-foreground">
                    Writing to us means we hold your address and your message in
                    our mailbox for as long as it takes to deal with it.
                    Nothing else happens to it — see the{" "}
                    <Link
                      href="/privacy"
                      className="rounded-sm font-medium text-primary underline underline-offset-4 transition-colors outline-none hover:text-secondary focus-visible:ring-3 focus-visible:ring-secondary/50"
                    >
                      privacy policy
                    </Link>
                    .
                  </p>
                </div>
              </Reveal>
            </div>
          </Container>
        </section>
      </main>

      <Footer />
    </>
  )
}
