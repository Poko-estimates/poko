import { Container } from "@/components/site/container"

const steps = [
  {
    title: "Open the room",
    body: "Create a session, pick your deck and share one link. Players join from the browser — no install, no account needed for guests.",
  },
  {
    title: "Deal the story",
    body: "Pull the next ticket from the synced backlog, start the timer, and everyone lays a card face down at the same time.",
  },
  {
    title: "Flip and commit",
    body: "Cards turn over together. Talk through the outliers, agree the number, and Poko writes it back to the ticket.",
  },
]

function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-24 border-y border-border bg-background py-20 sm:py-28"
    >
      <Container>
        <div className="max-w-2xl">
          <p className="text-sm font-semibold tracking-[0.14em] text-secondary uppercase">
            How it works
          </p>
          <h2 className="mt-4 text-3xl leading-tight font-semibold tracking-tight text-primary text-balance sm:text-4xl">
            Three steps, ninety seconds a story
          </h2>
        </div>

        <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          {steps.map((step, index) => (
            <li key={step.title} className="relative">
              {/* Rule linking the steps on wide screens. */}
              {index < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute top-6 left-14 hidden h-px w-[calc(100%-3rem)] bg-border md:block"
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
            </li>
          ))}
        </ol>
      </Container>
    </section>
  )
}

export { HowItWorks }
