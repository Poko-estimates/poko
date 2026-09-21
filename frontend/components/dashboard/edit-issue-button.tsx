"use client"

import { useState } from "react"
import { Pencil } from "lucide-react"

import { IssueDialog } from "@/components/dashboard/issue-dialog"
import type { Issue, Sprint } from "@/lib/issues/model"
import { cn } from "@/lib/utils"

/**
 * Opens the issue form pre-filled for editing.
 *
 * A thin wrapper so each sidebar row owns its own dialog state. The form reads
 * the issue fresh every time it opens, so a name changed by realtime in the
 * meantime shows up rather than being stale.
 */
function EditIssueButton({
  issue,
  sprints,
}: {
  issue: Issue
  sprints: Sprint[]
}) {
  const [open, setOpen] = useState(false)

  // A closed round is a record of what the team decided. Reopening is the way
  // back to editing, and it's a visible act everyone at the table sees. The
  // database refuses these edits too, so this is a signpost rather than the
  // control.
  const locked = issue.status === "closed"

  return (
    <>
      <button
        type="button"
        disabled={locked}
        title={locked ? "Reopen the round to edit this issue" : undefined}
        aria-label={
          locked
            ? `Edit ${issue.name} — reopen the round first`
            : `Edit ${issue.name}`
        }
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex size-8 shrink-0 items-center justify-center self-center rounded-lg transition-colors outline-none",
          locked
            ? "cursor-not-allowed text-muted-foreground/40"
            : "cursor-pointer text-muted-foreground hover:bg-primary/5 hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
        )}
      >
        <Pencil className="size-4" aria-hidden="true" />
      </button>

      {!locked && (
        <IssueDialog
          issue={issue}
          sprints={sprints}
          open={open}
          onOpenChange={setOpen}
        />
      )}
    </>
  )
}

export { EditIssueButton }
