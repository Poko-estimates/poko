"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { deleteIssue } from "@/lib/issues/actions"
import type { Issue } from "@/lib/issues/model"

/**
 * Deletes an issue, behind a confirmation.
 *
 * An alert dialog rather than a plain one: there is no undo, so the way out
 * has to be a deliberate button press and not a stray click on the backdrop.
 */
function DeleteIssueDialog({
  issue,
  isActive,
}: {
  issue: Issue
  /** Whether this is the issue currently open, so we know to navigate away. */
  isActive: boolean
}) {
  const router = useRouter()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteIssue(issue.id)

      // The dialog closes either way, and the outcome is reported in a toast:
      // leaving it open on failure would put the error in the one place the
      // user is about to navigate away from.
      setOpen(false)

      if (result.formError) {
        toast.add({
          type: "error",
          title: "Couldn't delete that issue",
          description: result.formError,
        })
        return
      }

      toast.add({ type: "success", title: `Deleted “${issue.name}”` })

      // Drop the ?issue= param when the open issue is the one that just went,
      // rather than leaving a URL pointing at something deleted.
      if (isActive) router.push("/dashboard")
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        type="button"
        aria-label={`Delete ${issue.name}`}
        // cursor-pointer is explicit because Tailwind v4 no longer applies it
        // to buttons — browsers default them to an arrow.
        className="mr-1.5 inline-flex size-8 shrink-0 cursor-pointer items-center justify-center self-center rounded-lg text-destructive transition-colors outline-none hover:bg-destructive/10 focus-visible:ring-3 focus-visible:ring-destructive/40 data-popup-open:bg-destructive/10"
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </AlertDialogTrigger>

      <AlertDialogContent>
        <div className="flex flex-col gap-1.5">
          <AlertDialogTitle>Delete this issue?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-medium text-primary">{issue.name}</span> and
            every card played in it will be removed for everyone at the table.
            This cannot be undone.
          </AlertDialogDescription>
        </div>

        <AlertDialogFooter>
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={pending}
            onClick={() => setOpen(false)}
          >
            Keep it
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="lg"
            disabled={pending}
            onClick={handleDelete}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            {pending ? "Deleting…" : "Delete issue"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export { DeleteIssueDialog }
