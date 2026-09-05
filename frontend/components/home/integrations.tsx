import { Container } from "@/components/site/container"
import { Reveal } from "@/components/site/reveal"

const trackers = [
  "Jira",
  "GitHub Issues",
  "Azure DevOps",
  "Trello",
]

function Integrations() {
  return (
    <section className="border-b border-border bg-background py-10">
      <Container className="flex flex-col items-center gap-6 lg:flex-row lg:gap-10">
        <Reveal
          as="p"
          className="max-w-xs text-center text-sm leading-relaxed font-medium text-muted-foreground lg:text-left"
        >
          Works where your backlog already lives
        </Reveal>
        <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 lg:justify-start">
          {trackers.map((tracker, index) => (
            <Reveal
              as="li"
              key={tracker}
              delay={index * 80}
              className="group text-lg font-semibold tracking-tight"
            >
              <span className="text-primary/45 transition-colors duration-300 group-hover:text-primary">
                {tracker}
              </span>
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  )
}

export { Integrations }
