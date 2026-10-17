"use client"

import { useTransition } from "react"

import { useToast } from "@/components/ui/toast"
import { isEstimateCard } from "@/lib/decks"
import { setEstimate } from "@/lib/issues/actions"
import { cn } from "@/lib/utils"

/**
 * The owner's way to record what a split vote was talked down to. Cards only,
 * never free text: the database rejects anything outside the deck anyway.
 */
function EstimatePicker({
  issueId,
  values,
  current,
  onSaved,
}: {
  issueId: string
  values: string[]
  current: string | null
  onSaved?: () => void
}) {
  const toast = useToast()
  const [pending, startTransition] = useTransition()

  function pick(value: string) {
    startTransition(async () => {
      const result = await setEstimate(issueId, value)

      if (result.formError) {
        toast.add({ type: "error", title: result.formError })
        return
      }

      toast.add({ type: "success", title: `Estimate saved — ${value}` })
      onSaved?.()
    })
  }

  return (
    <div
      role="group"
      aria-label="Agreed estimate"
      aria-busy={pending}
      className="flex flex-wrap gap-2"
    >
      {values.filter(isEstimateCard).map((value) => {
        const selected = value === current

        return (
          <button
            key={value}
            type="button"
            disabled={pending}
            aria-pressed={selected}
            onClick={() => pick(value)}
            className={cn(
              "flex h-11 min-w-11 items-center justify-center rounded-lg border px-2.5 text-sm font-semibold tabular-nums transition-colors outline-none focus-visible:ring-3 focus-visible:ring-secondary/50 disabled:cursor-wait disabled:opacity-60",
              selected
                ? "border-secondary bg-secondary text-primary"
                : "border-border bg-card text-primary hover:border-secondary/50"
            )}
          >
            {value}
          </button>
        )
      })}
    </div>
  )
}

export { EstimatePicker }
