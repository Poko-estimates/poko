"use client"

import { useTransition } from "react"
import { Pause, Play, RotateCcw, TimerOff } from "lucide-react"

import { useToast } from "@/components/ui/toast"
import {
  pauseRound,
  resetRound,
  resumeRound,
  stopRound,
  type IssueResult,
} from "@/lib/issues/actions"
import { cn } from "@/lib/utils"

/**
 * Pause, reset and stop for a running clock. Owner only, like every other
 * control over the pace of a round.
 *
 * Three things that are easy to confuse, so the labels are explicit about
 * which is which:
 *
 *   pause / resume  holds the clock, voting stays open
 *   reset           runs the same length again from now
 *   stop            drops the clock, voting stays open and untimed
 *
 * None of them ends the round — closing voting has its own button, and it
 * would be a nasty surprise if a control that looks like a media key settled
 * the estimate.
 */
function RoundClockControls({
  issueId,
  paused,
}: {
  issueId: string
  paused: boolean
}) {
  const toast = useToast()
  const [pending, startTransition] = useTransition()

  function run(action: () => Promise<IssueResult>) {
    startTransition(async () => {
      const result = await action()

      // No toast on success: the chip beside these buttons is the
      // confirmation, and it changes on every one of them.
      if (result.formError) {
        toast.add({ type: "error", title: result.formError })
      }
    })
  }

  return (
    <span className="inline-flex items-center gap-0.5 rounded-lg border border-border p-0.5">
      {paused ? (
        <button
          type="button"
          disabled={pending}
          aria-label="Resume the clock"
          title="Resume"
          onClick={() => run(() => resumeRound(issueId))}
          className={cn(controlClass, "text-secondary hover:text-secondary")}
        >
          <Play className="size-3.5" aria-hidden="true" />
        </button>
      ) : (
        <button
          type="button"
          disabled={pending}
          aria-label="Pause the clock"
          title="Pause"
          onClick={() => run(() => pauseRound(issueId))}
          className={controlClass}
        >
          <Pause className="size-3.5" aria-hidden="true" />
        </button>
      )}

      <button
        type="button"
        disabled={pending}
        aria-label="Reset the clock to the full round"
        title="Reset"
        onClick={() => run(() => resetRound(issueId))}
        className={controlClass}
      >
        <RotateCcw className="size-3.5" aria-hidden="true" />
      </button>

      <button
        type="button"
        disabled={pending}
        aria-label="Stop the clock and leave the round untimed"
        title="Stop"
        onClick={() => run(() => stopRound(issueId))}
        className={cn(controlClass, "hover:text-destructive")}
      >
        <TimerOff className="size-3.5" aria-hidden="true" />
      </button>
    </span>
  )
}

const controlClass =
  "inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-primary/5 hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"

export { RoundClockControls }
