import type { Metadata } from "next"
import { Bug, Lightbulb, MessagesSquare } from "lucide-react"

import { ContactForm } from "@/components/contact/contact-form"
import { Container } from "@/components/site/container"
import { Footer } from "@/components/site/footer"
import { NavBar } from "@/components/site/navbar"
import { Reveal } from "@/components/site/reveal"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Send the Poko team feedback, a bug report, or anything else about planning poker and estimation.",
}

/** What the form is for, so people can tell which of these they are sending. */
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

export default async function Page() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims

  const email = typeof claims?.email === "string" ? claims.email : ""
  const name = readFullName(claims)

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
                Estimation is a habit, and the tool should fit the way your
                team already works. If it doesn&apos;t, we want to hear about
                it, especially the parts that annoyed you.
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

                <p className="mt-8 rounded-2xl border border-dashed border-border px-4 py-4 text-xs leading-relaxed text-muted-foreground">
                  Your message is stored so we can read and reply to it, and
                  for nothing else. You don&apos;t need an account to send
                  one — if you have one, we&apos;ll note which it was.
                </p>
              </Reveal>

              <Reveal>
                <ContactForm defaultEmail={email} defaultName={name} />
              </Reveal>
            </div>
          </Container>
        </section>
      </main>

      <Footer />
    </>
  )
}

/**
 * The name captured at sign-up, if this session has one. Display only — user
 * metadata is editable by the user it belongs to, so it must never inform a
 * decision about access.
 */
function readFullName(claims: Record<string, unknown> | undefined) {
  const metadata = claims?.user_metadata
  if (typeof metadata !== "object" || metadata === null) return ""

  const fullName = (metadata as Record<string, unknown>).full_name
  return typeof fullName === "string" ? fullName.trim() : ""
}
