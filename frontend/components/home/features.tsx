import type { ComponentType } from "react"
import Link from "next/link"
import {
  ArrowRight,
  Blocks,
  ChartColumn,
  Check,
  EyeOff,
  Globe,
  Plug,
  Timer,
} from "lucide-react"

import { Container } from "@/components/site/container"
import { Reveal } from "@/components/site/reveal"
import { BacklogPreview } from "@/components/home/visuals/backlog-preview"
import { ConsensusPreview } from "@/components/home/visuals/consensus-preview"
import { cn } from "@/lib/utils"

type Split = {
  eyebrow: string
  title: string
  body: string
  points: string[]
  visual: ComponentType
}

const splits: Split[] = [
  {
    eyebrow: "Refinement, prepared",
    title: "Every story is already in the room",
    body: "Pull the sprint backlog straight from your tracker and queue it for the session. No copying ticket titles into a spreadsheet five minutes before stand-up.",
    points: [
      "Two-way sync with Jira, GitHub Issues, Azure DevOps, and Trello",
      "Reorder the queue mid-session as priorities shift",
      "Agreed points write back to the ticket the moment you commit",
    ],
    visual: BacklogPreview,
  },
  {
    eyebrow: "Reveal and resolve",
    title: "Turn a split vote into a decision",
    body: "Poko flags the spread instead of hiding it. The 3 and the 8 explain themselves, the team surfaces the hidden work, and you re-deal only when it will actually change the number.",
    points: [
      "Automatic outlier detection on every reveal",
      "Inline notes capture the why behind each estimate",
      "One-click re-vote when new information lands",
    ],
    visual: ConsensusPreview,
  },
]

const capabilities = [
  {
    icon: EyeOff,
    title: "Blind voting",
    body: "Cards stay face down until the last player commits, so nobody anchors on the loudest voice in the retro.",
  },
  {
    icon: Timer,
    title: "Timeboxed rounds",
    body: "A shared countdown keeps each story to ninety seconds and the whole session inside its calendar slot.",
  },
  {
    icon: Blocks,
    title: "Any deck you like",
    body: "Fibonacci, modified Fibonacci, T-shirt sizes, powers of two, or a custom deck saved per team.",
  },
  {
    icon: Plug,
    title: "Tracker sync",
    body: "Import stories and push estimates back automatically. Your backlog stays the single source of truth.",
  },
  {
    icon: Globe,
    title: "Async rounds",
    body: "Split across time zones? Players leave a vote and a note, and Poko reveals once the room is complete.",
  },
  {
    icon: ChartColumn,
    title: "Estimation history",
    body: "Track spread, velocity and the story types your team consistently under-points, sprint over sprint.",
  },
]

function Features() {
  return (
    <section id="features" className="scroll-mt-24 bg-surface py-20 sm:py-28">
      <Container>
        <Reveal className="max-w-2xl">
          <p className="text-sm font-semibold tracking-[0.14em] text-secondary uppercase">
            Features
          </p>
          <h2 className="mt-4 text-3xl leading-tight font-semibold tracking-tight text-primary text-balance sm:text-4xl">
            Everything a refinement session needs, and nothing it doesn&apos;t
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            Built around the way agile teams actually estimate: pull the
            backlog, deal a round, talk about the gap, commit the number.
          </p>
        </Reveal>

        <div className="mt-14 space-y-6">
          {splits.map((split, index) => {
            const Visual = split.visual
            const reversed = index % 2 === 1

            return (
              <Reveal
                as="article"
                key={split.title}
                className="grid overflow-hidden rounded-3xl border border-border bg-card lg:grid-cols-2"
              >
                <div
                  className={cn(
                    "flex min-w-0 flex-col justify-center gap-5 p-8 sm:p-12",
                    reversed && "lg:order-2"
                  )}
                >
                  <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                    {split.eyebrow}
                  </p>
                  <h3 className="text-2xl font-semibold tracking-tight text-primary text-balance sm:text-3xl">
                    {split.title}
                  </h3>
                  <p className="leading-relaxed text-muted-foreground">
                    {split.body}
                  </p>
                  <ul className="space-y-3">
                    {split.points.map((point) => (
                      <li key={point} className="flex gap-3 text-sm text-primary">
                        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary/20">
                          <Check className="size-3 text-primary" />
                        </span>
                        {point}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/signup"
                    className="group/link mt-1 inline-flex w-fit items-center gap-1.5 rounded-md text-sm font-semibold text-primary outline-none focus-visible:ring-3 focus-visible:ring-secondary/50"
                  >
                    Try it on your backlog
                    <ArrowRight className="size-4 text-secondary transition-transform group-hover/link:translate-x-0.5" />
                  </Link>
                </div>

                <div
                  className={cn(
                    // min-w-0 lets the grid track shrink below the mockup's
                    // intrinsic width instead of forcing the card wider.
                    "flex min-w-0 items-center bg-surface p-4 sm:p-10",
                    reversed && "lg:order-1"
                  )}
                >
                  <div className="w-full min-w-0">
                    <Visual />
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>

        <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((capability, index) => (
            <Reveal
              as="li"
              key={capability.title}
              delay={(index % 3) * 90}
              className="group"
            >
              <div className="h-full rounded-2xl border border-border bg-card p-6 transition-[transform,box-shadow] duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-[0_16px_40px_-24px_rgba(20,33,61,0.5)]">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary transition-transform duration-300 group-hover:scale-105">
                  <capability.icon className="size-5 text-secondary" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-primary">
                  {capability.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {capability.body}
                </p>
              </div>
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  )
}

export { Features }
