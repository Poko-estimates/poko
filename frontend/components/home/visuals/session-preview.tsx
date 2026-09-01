import { Timer, Users } from "lucide-react"

import { cn } from "@/lib/utils"

type Participant = {
  initials: string
  name: string
  vote: string | null
}

const participants: Participant[] = [
  { initials: "AK", name: "Ama Kyei", vote: "5" },
  { initials: "DM", name: "Daniel Mensah", vote: "5" },
  { initials: "SO", name: "Sena Osei", vote: "8" },
  { initials: "RT", name: "Rita Tetteh", vote: "3" },
  { initials: "JB", name: "Joel Baidoo", vote: "5" },
  { initials: "LN", name: "Linda Nartey", vote: null },
]

const deck = ["1", "2", "3", "5", "8", "13", "?"]
const myVote = "5"

/** Mock of a live estimation room, used as the hero visual. */
function SessionPreview() {
  return (
    <figure className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_28px_60px_-24px_rgba(20,33,61,0.45)]">
      <figcaption className="sr-only">
        A Poko estimation room where five of six teammates have voted on ticket
        PK-2481 and the table has settled on five points.
      </figcaption>

      {/* Window chrome */}
      <div className="flex items-center gap-2.5 bg-primary px-4 py-3 sm:gap-3">
        <div className="flex shrink-0 gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-white/25" />
          <span className="size-2.5 rounded-full bg-white/25" />
          <span className="size-2.5 rounded-full bg-white/25" />
        </div>
        <p className="min-w-0 truncate font-mono text-xs text-white/60">
          poko.app/room/atlas-sprint-24
        </p>
        <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full bg-secondary/15 px-2.5 py-1 text-[0.6875rem] font-semibold tracking-wide text-secondary uppercase">
          <span className="size-1.5 rounded-full bg-secondary" />
          Live
        </span>
      </div>

      <div className="space-y-4 p-4 sm:space-y-5 sm:p-6">
        {/* Ticket under discussion */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-secondary/15 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
                PK-2481
              </span>
              <span className="text-xs text-muted-foreground">
                Sprint 24 · Refinement
              </span>
            </div>
            <p className="mt-2 text-base font-semibold text-primary">
              Add SSO for enterprise workspaces
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 font-mono text-xs font-medium text-primary">
              <Timer className="size-3.5 text-secondary" />
              01:12
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-primary">
              <Users className="size-3.5 text-secondary" />
              5/6
            </span>
          </div>
        </div>

        {/* Table */}
        <ul className="grid grid-cols-3 gap-2 sm:gap-3">
          {participants.map((person) => (
            <li
              key={person.initials}
              className="flex min-w-0 flex-col items-center gap-2 rounded-xl bg-surface p-2 sm:p-3"
            >
              <div
                className={cn(
                  "flex h-14 w-11 items-center justify-center rounded-lg text-lg font-semibold tabular-nums",
                  person.vote
                    ? "bg-primary text-white"
                    : "border-2 border-dashed border-border bg-card text-muted-foreground"
                )}
              >
                {person.vote ?? (
                  <span className="flex gap-0.5" aria-hidden="true">
                    <span className="size-1 rounded-full bg-current" />
                    <span className="size-1 rounded-full bg-current" />
                    <span className="size-1 rounded-full bg-current" />
                  </span>
                )}
              </div>
              <span className="flex min-w-0 items-center gap-1.5 text-[0.6875rem] font-medium text-muted-foreground">
                <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[0.5625rem] font-bold text-primary">
                  {person.initials}
                </span>
                {person.name.split(" ")[0]}
              </span>
              <span className="sr-only">
                {person.vote
                  ? `${person.name} voted ${person.vote}`
                  : `${person.name} is still voting`}
              </span>
            </li>
          ))}
        </ul>

        {/* Your deck */}
        <div>
          <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Your hand
          </p>
          <div className="flex gap-1.5">
            {deck.map((value) => (
              <span
                key={value}
                className={cn(
                  "flex h-12 flex-1 items-center justify-center rounded-lg border text-sm font-semibold tabular-nums transition-colors",
                  value === myVote
                    ? "-translate-y-1 border-secondary bg-secondary text-primary shadow-[0_8px_16px_-8px_rgba(252,163,17,0.9)]"
                    : "border-border bg-card text-primary"
                )}
              >
                {value}
              </span>
            ))}
          </div>
        </div>

        {/* Outcome */}
        <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-3 sm:gap-4 sm:px-4">
          <div>
            <p className="text-xs text-muted-foreground">Team consensus</p>
            <p className="text-sm font-semibold text-primary">
              5 points · 1 outlier to discuss
            </p>
          </div>
          <span className="shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white">
            Save estimate
          </span>
        </div>
      </div>
    </figure>
  )
}

export { SessionPreview }
