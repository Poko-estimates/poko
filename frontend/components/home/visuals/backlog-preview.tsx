import { ArrowDownUp, Check, RefreshCw } from "lucide-react"

import { cn } from "@/lib/utils"

type Story = {
  key: string
  title: string
  points: string | null
  state: "estimated" | "active" | "queued"
}

const stories: Story[] = [
  {
    key: "PK-2478",
    title: "Rate limit the invite endpoint",
    points: "2",
    state: "estimated",
  },
  {
    key: "PK-2479",
    title: "Retry failed webhook deliveries",
    points: "3",
    state: "estimated",
  },
  {
    key: "PK-2481",
    title: "Add SSO for enterprise workspaces",
    points: null,
    state: "active",
  },
  {
    key: "PK-2482",
    title: "Export sprint report as CSV",
    points: null,
    state: "queued",
  },
  {
    key: "PK-2486",
    title: "Migrate audit log to partitioned tables",
    points: null,
    state: "queued",
  },
]

/** Mock of an imported backlog queued for estimation. */
function BacklogPreview() {
  return (
    <figure className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_50px_-28px_rgba(20,33,61,0.4)]">
      <figcaption className="sr-only">
        A sprint backlog imported into Poko, with two stories already estimated
        and the rest queued behind the story currently on the table.
      </figcaption>

      {/* Wraps rather than squeezing the title once the card gets narrow. */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
        <div className="min-w-0 flex-1 basis-30">
          <p className="text-sm font-semibold text-primary">Sprint 24 backlog</p>
          <p className="text-xs text-muted-foreground">
            18 stories · synced 2 min ago
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium">
            <ArrowDownUp className="size-3.5" />
            Order
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-white">
            <RefreshCw className="size-3.5 text-secondary" />
            Sync
          </span>
        </div>
      </div>

      <ul className="divide-y divide-border">
        {stories.map((story) => (
          <li
            key={story.key}
            className={cn(
              "flex items-center gap-2.5 px-4 py-3.5 sm:gap-3 sm:px-5",
              story.state === "active" && "bg-secondary/10"
            )}
          >
            <span
              className={cn(
                "w-1 self-stretch rounded-full",
                story.state === "active" ? "bg-secondary" : "bg-transparent"
              )}
              aria-hidden="true"
            />
            <span className="shrink-0 font-mono text-xs text-muted-foreground">
              {story.key}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-primary">
              {story.title}
            </span>
            {story.state === "estimated" ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary tabular-nums">
                <Check className="size-3 text-secondary" />
                {story.points}
              </span>
            ) : story.state === "active" ? (
              <span className="shrink-0 rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-primary">
                Voting
              </span>
            ) : (
              <span className="shrink-0 rounded-md border border-dashed border-border px-2 py-1 text-xs font-medium text-muted-foreground">
                —
              </span>
            )}
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2 border-t border-border bg-surface px-4 py-3 text-xs text-muted-foreground sm:px-5">
        Estimates write back to your Agile Management tool in real-time.
      </div>
    </figure>
  )
}

export { BacklogPreview }
