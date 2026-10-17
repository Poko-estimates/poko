import { Container } from "@/components/site/container"
import { Reveal } from "@/components/site/reveal"

const steps = [
  {
    title: "Open the room",
    body: "Name the story, pick your deck and share one link. Players join from the browser — no install, no account needed for guests.",
  },
  {
    title: "Deal the story",
    body: "Take the next story off the queue, start the timer, and everyone lays a card face down at the same time.",
  },
  {
    title: "Flip and commit",
    body: "Cards turn over together. If they match, Poko records the estimate. If they don't, talk it through and re-vote.",
  },
]

function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-24 border-y border-border bg-background py-20 sm:py-28"
    >
      <Container>
        <Reveal className="max-w-2xl">
          <p className="text-sm font-semibold tracking-[0.14em] text-secondary uppercase">
            How it works
          </p>
          <h2 className="mt-4 text-3xl leading-tight font-semibold tracking-tight text-primary text-balance sm:text-4xl">
            Three steps, a couple of minutes a story
          </h2>
        </Reveal>

        <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          {steps.map((step, index) => (
            <Reveal
              as="li"
              key={step.title}
              delay={index * 140}
              className="group relative"
            >
              {/* Rule linking the steps on wide screens, drawn as each step lands. */}
              {index < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute top-6 left-14 hidden h-px w-[calc(100%-3rem)] origin-left scale-x-0 bg-border transition-transform delay-300 duration-700 ease-out group-data-[visible=true]:scale-x-100 md:block"
                />
              )}
              <span className="relative flex size-12 items-center justify-center rounded-2xl bg-primary text-lg font-semibold text-secondary tabular-nums">
                {index + 1}
              </span>
              <h3 className="mt-5 text-xl font-semibold tracking-tight text-primary">
                {step.title}
              </h3>
              <p className="mt-3 leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </Reveal>
          ))}
        </ol>
      </Container>
    </section>
  )
}

export { HowItWorks }
