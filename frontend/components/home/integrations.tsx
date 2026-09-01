import { Container } from "@/components/site/container"

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
        <p className="max-w-xs text-center text-sm leading-relaxed font-medium text-muted-foreground lg:text-left">
          Works where your backlog already lives
        </p>
        <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 lg:justify-start">
          {trackers.map((tracker) => (
            <li
              key={tracker}
              className="text-lg font-semibold tracking-tight text-primary/45 transition-colors hover:text-primary"
            >
              {tracker}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}

export { Integrations }
