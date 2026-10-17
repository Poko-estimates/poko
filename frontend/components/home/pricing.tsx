import Link from "next/link"
import { Check } from "lucide-react"

import { Container } from "@/components/site/container"
import { Reveal } from "@/components/site/reveal"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Plan = {
  name: string
  price: string
  cadence: string
  summary: string
  features: string[]
  /** Absent while the plan can't be bought yet — see the terms' "Plans and payment". */
  cta?: { label: string; href: string }
  badge?: string
  featured?: boolean
}

const plans: Plan[] = [
  {
    name: "Starter",
    price: "Free",
    cadence: "forever",
    summary: "For one squad giving planning poker a proper try.",
    features: [
      "Unlimited sessions and players",
      "Blind voting with a shared reveal",
      "Fibonacci, powers of two and custom decks",
      "Timeboxed rounds you can pause and reset",
      "Sprints and a reorderable queue",
      "Guests join by link, no account needed",
    ],
    cta: { label: "Start for free", href: "/signup" },
  },
  {
    name: "Team",
    price: "$10",
    cadence: "per month",
    summary: "For delivery teams refining a backlog every sprint.",
    features: [
      "Everything in Starter",
      "Two-way Jira, Linear and GitHub sync",
      "Async voting across time zones",
      "Outlier detection and estimate notes",
      "Full history, velocity trends and CSV export",
    ],
    badge: "Coming soon",
    featured: true,
  },
]

function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-24 bg-surface py-20 sm:py-28">
      <Container>
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-[0.14em] text-secondary uppercase">
            Pricing
          </p>
          <h2 className="mt-4 text-3xl leading-tight font-semibold tracking-tight text-primary text-balance sm:text-4xl">
            Free while we build the rest
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            Everything Poko does today is free, with no limit on sessions or
            players. The Team plan adds tracker sync and history when it ships.
          </p>
        </Reveal>

        <div className="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-2">
          {plans.map((plan, index) => (
            <Reveal key={plan.name} delay={index * 120} className="group flex">
              <div
                className={cn(
                  "flex flex-1 flex-col rounded-3xl border p-6 transition-[transform,box-shadow] duration-300 ease-out group-hover:-translate-y-1 sm:p-8",
                  plan.featured
                    ? "border-primary bg-primary text-white shadow-[0_28px_60px_-28px_rgba(20,33,61,0.6)] group-hover:shadow-[0_36px_70px_-28px_rgba(20,33,61,0.7)]"
                    : "border-border bg-card group-hover:shadow-[0_24px_50px_-28px_rgba(20,33,61,0.5)]"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3
                    className={cn(
                      "text-lg font-semibold",
                      plan.featured ? "text-white" : "text-primary"
                    )}
                  >
                    {plan.name}
                  </h3>
                  {plan.badge && (
                    <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-primary">
                      {plan.badge}
                    </span>
                  )}
                </div>
                <p
                  className={cn(
                    "mt-2 text-sm leading-relaxed",
                    plan.featured ? "text-white/65" : "text-muted-foreground"
                  )}
                >
                  {plan.summary}
                </p>

                {/* Price and cadence stack so both cards line their CTAs up. */}
                <div className="mt-6">
                  <p
                    className={cn(
                      "text-4xl leading-none font-semibold tracking-tight tabular-nums",
                      plan.featured ? "text-secondary" : "text-primary"
                    )}
                  >
                    {plan.price}
                  </p>
                  <p
                    className={cn(
                      "mt-2 text-sm",
                      plan.featured ? "text-white/60" : "text-muted-foreground"
                    )}
                  >
                    {plan.cadence}
                  </p>
                </div>

                {plan.cta ? (
                  <Link
                    href={plan.cta.href}
                    className={cn(
                      buttonVariants({
                        variant: plan.featured ? "secondary" : "outline",
                        size: "xl",
                      }),
                      "mt-8 w-full justify-center"
                    )}
                  >
                    {plan.cta.label}
                  </Link>
                ) : (
                  // Text, not a disabled button: there is nothing to press yet.
                  <p
                    className={cn(
                      "mt-8 flex h-11 items-center justify-center rounded-xl border text-[0.9375rem] font-semibold",
                      plan.featured
                        ? "border-white/20 text-white/70"
                        : "border-border text-muted-foreground"
                    )}
                  >
                    Not available yet
                  </p>
                )}

                <ul
                  className={cn(
                    "mt-8 flex-1 space-y-3 border-t pt-8 text-sm",
                    plan.featured ? "border-white/15" : "border-border"
                  )}
                >
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-3">
                      <Check
                        className="mt-0.5 size-4 shrink-0 text-secondary"
                        aria-hidden="true"
                      />
                      <span
                        className={
                          plan.featured
                            ? "text-white/80"
                            : "text-muted-foreground"
                        }
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  )
}

export { Pricing }
