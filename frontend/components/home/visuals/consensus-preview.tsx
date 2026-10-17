import { RotateCcw } from "lucide-react"

const distribution = [
  { value: "1", votes: 0 },
  { value: "2", votes: 0 },
  { value: "3", votes: 1 },
  { value: "5", votes: 3 },
  { value: "8", votes: 1 },
  { value: "13", votes: 0 },
]

const totalVotes = distribution.reduce((sum, bar) => sum + bar.votes, 0)
const mostVotes = Math.max(...distribution.map((bar) => bar.votes))

/** Mock of the reveal screen when the cards split: no estimate, a prompt to talk. */
function ConsensusPreview() {
  return (
    <figure className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_50px_-28px_rgba(20,33,61,0.4)]">
      <figcaption className="sr-only">
        The reveal screen for PK-2481: three votes of five, one three and one
        eight. With no consensus, nothing is recorded and voting can reopen.
      </figcaption>

      <div className="border-b border-border px-5 py-4">
        <p className="text-sm font-semibold text-primary">Round revealed</p>
        <p className="text-xs text-muted-foreground">
          {totalVotes} votes · from 3 to 8
        </p>
      </div>

      <div className="space-y-2.5 px-5 py-5">
        {distribution.map((bar) => (
          <div key={bar.value} className="flex items-center gap-3">
            <span className="w-6 text-right font-mono text-xs font-semibold text-primary tabular-nums">
              {bar.value}
            </span>
            <div className="h-7 flex-1 overflow-hidden rounded-md bg-surface">
              <div
                className={
                  bar.votes === mostVotes
                    ? "h-full rounded-md bg-secondary"
                    : "h-full rounded-md bg-primary/25"
                }
                style={{ width: `${(bar.votes / mostVotes) * 100}%` }}
              />
            </div>
            <span className="w-10 text-xs text-muted-foreground tabular-nums">
              {bar.votes === 1 ? "1 vote" : `${bar.votes} votes`}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-primary">No consensus</p>
          <p className="text-xs text-muted-foreground">
            Talk it over, then re-vote.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white">
          <RotateCcw className="size-3.5 text-secondary" />
          Reopen voting
        </span>
      </div>
    </figure>
  )
}

export { ConsensusPreview }
