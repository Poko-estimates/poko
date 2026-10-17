"use client"

import { useId, useState, useTransition } from "react"
import { Play, Timer } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useToast } from "@/components/ui/toast"
import { startRound } from "@/lib/issues/actions"
import {
  defaultRoundSeconds,
  formatSeconds,
  maxRoundSeconds,
  minRoundSeconds,
} from "@/lib/rooms/clock"
import { cn } from "@/lib/utils"

/**
 * Sets and starts the round's clock, with the story in front of you.
 *
 * Deliberately not part of creating the issue. How long a story is worth
 * arguing about is only knowable once the room is looking at it, and a length
 * chosen days earlier in a form is one nobody remembers agreeing to.
 *
 * Minutes and seconds as two inputs rather than one field: "90" is ambiguous
 * and "1.5" is worse. Two boxes make the unit part of the label.
 */
function RoundTimerSetup({
  issueId,
  /** The last length this issue ran for, if any — the useful default. */
  lastSeconds,
}: {
  issueId: string
  lastSeconds: number | null
}) {
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const minutesId = useId()
  const secondsId = useId()

  const initial = lastSeconds ?? defaultRoundSeconds
  const [minutes, setMinutes] = useState(String(Math.floor(initial / 60)))
  const [seconds, setSeconds] = useState(String(initial % 60))

  // Blank counts as zero so clearing the minutes box to type "45" seconds does
  // not read as invalid mid-keystroke.
  const total = toNumber(minutes) * 60 + toNumber(seconds)
  const usable = total >= minRoundSeconds && total <= maxRoundSeconds

  function handleStart() {
    startTransition(async () => {
      const result = await startRound(issueId, total)

      if (result.formError) {
        toast.add({ type: "error", title: result.formError })
        return
      }

      // The countdown replacing this control is the confirmation, so there is
      // no toast on success.
      setOpen(false)
    })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button type="button" variant="outline" size="lg">
            <Timer className="size-4" aria-hidden="true" />
            {lastSeconds ? `Timer · ${formatSeconds(lastSeconds)}` : "Set timer"}
          </Button>
        }
      />

      <PopoverContent className="w-72">
        <p className="text-sm font-semibold text-primary">
          How long should this round run?
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Everyone sees the same countdown. When it reaches zero the round
          closes and the cards turn over.
        </p>

        <div className="mt-4 flex items-end gap-2">
          <div className="flex-1">
            <label
              htmlFor={minutesId}
              className="block text-xs font-medium text-muted-foreground"
            >
              Minutes
            </label>
            <input
              id={minutesId}
              type="number"
              inputMode="numeric"
              min={0}
              max={60}
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
              className={inputClass}
            />
          </div>

          <span className="pb-2.5 text-sm font-semibold text-muted-foreground">
            :
          </span>

          <div className="flex-1">
            <label
              htmlFor={secondsId}
              className="block text-xs font-medium text-muted-foreground"
            >
              Seconds
            </label>
            <input
              id={secondsId}
              type="number"
              inputMode="numeric"
              min={0}
              max={59}
              value={seconds}
              onChange={(event) => setSeconds(event.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <p
          className={cn(
            "mt-2 text-xs leading-relaxed",
            usable ? "text-muted-foreground" : "font-medium text-destructive"
          )}
        >
          {usable
            ? `Runs for ${formatSeconds(total)}.`
            : `Pick between ${formatSeconds(minRoundSeconds)} and ${formatSeconds(maxRoundSeconds)}.`}
        </p>

        <Button
          type="button"
          variant="secondary"
          size="lg"
          // Disabled only for a length the database would refuse anyway, so
          // the button never fails for a reason the text above it hasn't
          // already given.
          disabled={pending || !usable}
          onClick={handleStart}
          className="mt-4 w-full"
        >
          <Play className="size-4" aria-hidden="true" />
          {pending ? "Starting…" : "Start round"}
        </Button>
      </PopoverContent>
    </Popover>
  )
}

/** Blank, minus signs and junk all read as zero rather than NaN. */
function toNumber(value: string) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

const inputClass =
  "mt-1 h-10 w-full min-w-0 rounded-xl border border-input bg-muted/50 px-3 text-sm tabular-nums text-foreground outline-none transition-[color,background-color,border-color,box-shadow] hover:bg-muted focus-visible:border-ring focus-visible:bg-background focus-visible:ring-3 focus-visible:ring-ring/40"

export { RoundTimerSetup }
