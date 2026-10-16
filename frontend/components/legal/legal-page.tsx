import Link from "next/link"

import { MailTo, TextLink } from "@/components/legal/prose"
import { Container } from "@/components/site/container"
import { Footer } from "@/components/site/footer"
import { NavBar } from "@/components/site/navbar"
import { Reveal } from "@/components/site/reveal"
import { entity } from "@/lib/legal/entity"

type LegalSection = {
  /** Anchor slug. Stable — people link to and cite these. */
  id: string
  heading: string
  body: React.ReactNode
}

type LegalPageProps = {
  eyebrow: string
  title: string
  /** One paragraph in plain language, before the document proper starts. */
  summary: React.ReactNode
  lastUpdated: string
  sections: readonly LegalSection[]
  /** The other two documents, so a reader can move between them. */
  related: readonly { label: string; href: string }[]
}

/**
 * The shared frame for the privacy policy, terms and cookie notice.
 *
 * Sections arrive as data rather than as children so the contents list can be
 * derived from the same array the document renders from. Written the other way
 * — a hand-maintained list of anchors beside the prose — a section renamed in
 * one place and not the other produces a table of contents that silently links
 * to nothing, which is exactly the kind of rot a legal page accumulates.
 */
function LegalPage({
  eyebrow,
  title,
  summary,
  lastUpdated,
  sections,
  related,
}: LegalPageProps) {
  return (
    <>
      <NavBar />

      <main className="flex-1">
        <section className="border-b border-border bg-surface py-16 sm:py-20">
          <Container>
            <Reveal className="max-w-2xl">
              <p className="text-sm font-semibold tracking-wide text-secondary uppercase">
                {eyebrow}
              </p>
              <h1 className="mt-3 text-3xl leading-tight font-semibold tracking-tight text-primary text-balance sm:text-4xl">
                {title}
              </h1>
              <div className="mt-5 text-lg leading-relaxed text-muted-foreground">
                {summary}
              </div>
              <p className="mt-6 text-sm text-muted-foreground">
                Last updated{" "}
                <time className="font-medium text-primary">{lastUpdated}</time>
              </p>
            </Reveal>
          </Container>
        </section>

        <section className="bg-background py-14 sm:py-16">
          <Container>
            <div className="grid gap-12 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-16">
              {/* Sticky on a wide screen, an ordinary block on a narrow one:
                  a fixed contents list is only useful next to the text, not
                  stacked on top of it. */}
              <nav
                aria-labelledby="legal-contents"
                className="lg:sticky lg:top-24 lg:self-start"
              >
                <h2
                  id="legal-contents"
                  className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                >
                  Contents
                </h2>
                <ol className="mt-5 flex flex-col gap-2.5">
                  {sections.map((section, index) => (
                    <li key={section.id}>
                      <Link
                        href={`#${section.id}`}
                        className="flex gap-2.5 rounded-sm text-sm leading-snug text-muted-foreground transition-colors outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-secondary/50"
                      >
                        <span
                          aria-hidden="true"
                          className="tabular-nums text-secondary"
                        >
                          {index + 1}.
                        </span>
                        {section.heading}
                      </Link>
                    </li>
                  ))}
                </ol>
              </nav>

              <article className="flex max-w-3xl flex-col gap-12">
                {sections.map((section, index) => (
                  <section
                    key={section.id}
                    id={section.id}
                    // Clears the sticky header when an anchor is followed.
                    className="scroll-mt-24"
                  >
                    <h2 className="flex gap-3 text-xl leading-tight font-semibold tracking-tight text-primary sm:text-2xl">
                      <span
                        aria-hidden="true"
                        className="tabular-nums text-secondary"
                      >
                        {index + 1}.
                      </span>
                      {section.heading}
                    </h2>
                    <div className="mt-4 flex flex-col gap-4">
                      {section.body}
                    </div>
                  </section>
                ))}

                <div className="flex flex-col gap-4 border-t border-border pt-8">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Questions about this document? Write to{" "}
                    <MailTo address={entity.privacyEmail} /> or use the{" "}
                    <TextLink href="/contact">contact page</TextLink>.
                  </p>

                  <ul className="flex flex-wrap gap-x-6 gap-y-2">
                    {related.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className="rounded-sm text-sm font-medium text-muted-foreground transition-colors outline-none hover:text-secondary focus-visible:ring-3 focus-visible:ring-secondary/50"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            </div>
          </Container>
        </section>
      </main>

      <Footer />
    </>
  )
}

export { LegalPage }
export type { LegalSection }
