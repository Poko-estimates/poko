import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { Container } from "@/components/site/container"
import { SessionPreview } from "@/components/home/visuals/session-preview"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function Hero() {
  return (
    <section
      id="hero"
      className="relative isolate overflow-hidden bg-primary text-white"
    >
      <Container className="relative grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16 lg:py-28">
        <div className="min-w-0 max-w-xl">
          <h1 className="animate-rise text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Estimate as a team.{" "}
            <span className="text-secondary">Agree in minutes.</span>
          </h1>

          <p
            style={{ animationDelay: "120ms" }}
            className="animate-rise mt-6 text-lg leading-relaxed text-white/70"
          >
            Poko turns backlog refinement into a fast, honest round of planning
            poker. Everyone votes at once, the cards flip together, and the
            number lands back on your ticket before the meeting is over.
          </p>

          <div
            style={{ animationDelay: "240ms" }}
            className="animate-rise mt-9 flex flex-col gap-3 sm:flex-row"
          >
            <Link
              href="/signup"
              className={cn(
                buttonVariants({ variant: "secondary", size: "xl" }),
                "justify-center hover:-translate-y-0.5"
              )}
            >
              Start a free session
              <ArrowRight className="size-4 transition-transform group-hover/button:translate-x-0.5" />
            </Link>
          </div>
        </div>

        <div
          style={{ animationDelay: "360ms" }}
          className="animate-rise min-w-0 lg:pl-4"
        >
          <SessionPreview />
        </div>
      </Container>
    </section>
  )
}

export { Hero }
