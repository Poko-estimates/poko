import { cn } from "@/lib/utils"

/** The deck laid out as cards, exactly how a player will see their hand. */
function DeckPreview({
  className,
  values,
}: {
  className?: string
  values: string[]
}) {
  if (values.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
        Add a couple of values to see the deck.
      </p>
    )
  }

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {values.map((value) => (
        <span
          key={value}
          className="flex h-14 min-w-10 items-center justify-center rounded-lg border border-border bg-card px-1.5 text-sm font-semibold text-primary tabular-nums"
        >
          {value}
        </span>
      ))}
    </div>
  )
}

export { DeckPreview }
