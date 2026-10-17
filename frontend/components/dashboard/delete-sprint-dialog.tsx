"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Radio } from "@base-ui/react/radio"
import { RadioGroup } from "@base-ui/react/radio-group"
import { Trash2 } from "lucide-react"

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { deleteSprint, type SprintDisposition } from "@/lib/issues/actions"
import type { Issue, Sprint } from "@/lib/issues/model"
import { cn } from "@/lib/utils"

/**
 * Deletes a sprint, after asking what should become of the issues in it.
 *
 * The question is the point. A sprint is a container, so "delete" on its own
 * is ambiguous in the worst possible way — one reading loses a grouping, the
 * other loses every estimate the team agreed. So the choice is explicit, it
 * has no preselected destructive option, and the confirm button says which one
 * it is about to do.
 *
 * An alert dialog rather than a plain one: two of the three answers cannot be
 * undone, so the way out has to be a deliberate button press and not a stray
 * click on the backdrop.
 */
function DeleteSprintDialog({
  activeSlug,
  issues,
  onOpenChange,
  open,
  sprint,
  sprints,
}: {
  activeSlug: string | null
  /** The issues in this sprint, so the copy can count them. */
  issues: Issue[]
  onOpenChange: (open: boolean) => void
  open: boolean
  sprint: Sprint
  /** Every sprint this person owns, to offer as a destination. */
  sprints: Sprint[]
}) {
  const router = useRouter()
  const toast = useToast()
  const [pending, startTransition] = useTransition()

  const elsewhere = sprints.filter((option) => option.id !== sprint.id)
  const empty = issues.length === 0

  // Defaults to the answer that destroys nothing. Moving is offered first when
  // there is somewhere to move to, but it still needs a destination picked, so
  // it is not the default either.
  const [choice, setChoice] = useState<SprintDisposition>("uncategorize")
  const [target, setTarget] = useState<string>(elsewhere[0]?.id ?? "")

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteSprint(sprint.id, choice, target || null)

      // Closes either way, and the outcome goes in a toast: leaving it open on
      // failure puts the error where the user is about to navigate away from.
      onOpenChange(false)

      if (result.formError) {
        toast.add({
          type: "error",
          title: "Couldn't delete that sprint",
          description: result.formError,
        })
        return
      }

      toast.add({
        type: "success",
        title: `Deleted “${sprint.name}”`,
        description: describeOutcome(choice, result.affected ?? 0, elsewhere, target),
      })

      // Only navigate when what was open went with it. Uncategorizing and
      // moving leave every issue standing, so the selection survives.
      if (
        choice === "delete" &&
        activeSlug &&
        issues.some((issue) => issue.slug === activeSlug)
      ) {
        router.push("/dashboard")
      }
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <div className="flex flex-col gap-1.5">
          <AlertDialogTitle>Delete “{sprint.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            {empty
              ? "This sprint has no issues in it, so nothing else changes."
              : `It holds ${countOf(issues.length)}. Choose what happens to ${
                  issues.length === 1 ? "it" : "them"
                }.`}
          </AlertDialogDescription>
        </div>

        {!empty && (
          <RadioGroup
            aria-label={`What to do with the issues in ${sprint.name}`}
            value={choice}
            onValueChange={(value) => setChoice(value as SprintDisposition)}
            className="flex flex-col gap-2"
          >
            <Choice
              value="uncategorize"
              selected={choice === "uncategorize"}
              title="Keep them, without a sprint"
              detail="They move to Uncategorized. Nothing is lost."
            />

            {elsewhere.length > 0 && (
              <Choice
                value="move"
                selected={choice === "move"}
                title="Move them to another sprint"
                detail="Every issue keeps its estimate and its cards."
              >
                {/* Only rendered under the chosen option: a select sitting
                    under an unselected radio reads as a second, unrelated
                    question. */}
                {choice === "move" && (
                  <select
                    value={target}
                    onChange={(event) => setTarget(event.target.value)}
                    aria-label="Sprint to move the issues to"
                    className="mt-2.5 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {elsewhere.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                )}
              </Choice>
            )}

            <Choice
              value="delete"
              selected={choice === "delete"}
              destructive
              title={`Delete ${countOf(issues.length)} too`}
              detail="Every card played in them goes as well, for everyone who was at those tables. This cannot be undone."
            />
          </RadioGroup>
        )}

        <AlertDialogFooter>
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="lg"
            disabled={pending || (choice === "move" && !target)}
            onClick={handleDelete}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            {pending ? "Deleting…" : confirmLabel(choice, issues.length, empty)}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** One of the three answers, as a radio card. */
function Choice({
  children,
  destructive,
  detail,
  selected,
  title,
  value,
}: {
  children?: React.ReactNode
  destructive?: boolean
  detail: string
  selected: boolean
  title: string
  value: SprintDisposition
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer gap-3 rounded-2xl border p-3.5 transition-colors",
        selected
          ? destructive
            ? "border-destructive/50 bg-destructive/5"
            : "border-secondary bg-secondary/10"
          : "border-border bg-card hover:border-secondary/50 hover:bg-surface"
      )}
    >
      <Radio.Root
        value={value}
        className={cn(
          "mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-full border border-input bg-card transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          destructive
            ? "data-checked:border-destructive data-checked:bg-destructive"
            : "data-checked:border-secondary data-checked:bg-secondary"
        )}
      >
        <Radio.Indicator
          className={cn(
            "size-1.5 rounded-full data-unchecked:hidden",
            destructive ? "bg-destructive-foreground" : "bg-primary"
          )}
        />
      </Radio.Root>

      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-sm font-semibold",
            destructive ? "text-destructive" : "text-primary"
          )}
        >
          {title}
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
          {detail}
        </span>
        {children}
      </span>
    </label>
  )
}

function confirmLabel(
  choice: SprintDisposition,
  count: number,
  empty: boolean
) {
  if (empty) return "Delete sprint"

  switch (choice) {
    case "delete":
      return `Delete sprint and ${countOf(count)}`
    case "move":
      return "Move and delete sprint"
    default:
      return "Delete sprint only"
  }
}

/** What the toast says actually happened, in the same terms as the choice. */
function describeOutcome(
  choice: SprintDisposition,
  affected: number,
  elsewhere: Sprint[],
  target: string
) {
  if (affected === 0) return undefined

  switch (choice) {
    case "delete":
      return `${countOf(affected)} deleted with it.`
    case "move":
      return `${countOf(affected)} moved to ${
        elsewhere.find((option) => option.id === target)?.name ?? "another sprint"
      }.`
    default:
      return `${countOf(affected)} moved to Uncategorized.`
  }
}

function countOf(count: number) {
  return `${count} ${count === 1 ? "issue" : "issues"}`
}

export { DeleteSprintDialog }
