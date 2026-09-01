import { MessageSquareQuote, TriangleAlert } from "lucide-react"

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

/** Mock of the reveal screen: vote spread plus the outliers worth unpacking. */
function ConsensusPreview() {
  return (
    <figure className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_50px_-28px_rgba(20,33,61,0.4)]">
      <figcaption className="sr-only">
        The reveal screen for PK-2481: three votes of five, one three and one
        eight, with each outlier explaining their reasoning.
      </figcaption>

      <div className="border-b border-border px-5 py-4">
        <p className="text-sm font-semibold text-primary">Round revealed</p>
        <p className="text-xs text-muted-foreground">
          {totalVotes} votes · spread of 3 – 8 · median 5
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

      <div className="space-y-2 border-t border-border bg-surface px-5 py-4">
        <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-primary uppercase">
          <TriangleAlert className="size-3.5 text-secondary" />
          Outliers to unpack
        </p>
        <blockquote className="flex gap-2.5 rounded-lg bg-card p-3">
          <MessageSquareQuote className="mt-0.5 size-4 shrink-0 text-secondary" />
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-primary">Rita (3):</span> the
            identity provider work already shipped last sprint — this is
            configuration only.
          </p>
        </blockquote>
        <blockquote className="flex gap-2.5 rounded-lg bg-card p-3">
          <MessageSquareQuote className="mt-0.5 size-4 shrink-0 text-secondary" />
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-primary">Sena (8):</span> we
            still owe SCIM provisioning and an audit trail for every login.
          </p>
        </blockquote>
      </div>
    </figure>
  )
}

export { ConsensusPreview }
