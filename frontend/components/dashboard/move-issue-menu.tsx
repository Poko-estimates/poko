"use client"

import { useTransition } from "react"
import { Menu } from "@base-ui/react/menu"
import { Check, FolderInput, Inbox, Layers } from "lucide-react"

import { useToast } from "@/components/ui/toast"
import { moveIssueToSprint } from "@/lib/issues/actions"
import type { Issue, Sprint } from "@/lib/issues/model"
import { cn } from "@/lib/utils"

/**
 * Refiles one issue into another sprint, straight from its row.
 *
 * The edit dialog can do this too, but going through it means opening a form
 * over the whole list to change one field — and the list is the thing you are
 * looking at while deciding. This is the same choice in one gesture.
 *
 * Only the issues you own get this: the trigger behind it refuses to file an
 * issue into a sprint that is not its owner's, so offering it on someone
 * else's row would be offering something the database will turn down.
 */
function MoveIssueMenu({
  issue,
  sprints,
}: {
  issue: Issue
  /** The sprints this person owns — the only ones an issue can move into. */
  sprints: Sprint[]
}) {
  const toast = useToast()
  const [pending, startTransition] = useTransition()

  // With no sprints and no sprint of its own there is nowhere to go, so the
  // control would open onto a single disabled line.
  if (sprints.length === 0 && issue.sprint === null) return null

  function handleMove(sprintId: string | null, label: string) {
    startTransition(async () => {
      const result = await moveIssueToSprint(issue.id, sprintId)

      if (result.formError) {
        toast.add({
          type: "error",
          title: "Couldn't move that issue",
          description: result.formError,
        })
        return
      }

      toast.add({ type: "success", title: `Moved to ${label}` })
    })
  }

  return (
    <Menu.Root>
      <Menu.Trigger
        disabled={pending}
        aria-label={`Move ${issue.name} to another sprint`}
        className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center self-center rounded-lg text-muted-foreground transition-colors outline-none hover:bg-primary/5 hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50 data-disabled:opacity-50 data-popup-open:bg-primary/5 data-popup-open:text-primary"
      >
        <FolderInput className="size-3.5" aria-hidden="true" />
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={6} className="z-60">
          <Menu.Popup className="max-h-72 min-w-56 origin-[var(--transform-origin)] overflow-y-auto rounded-2xl border border-border bg-popover p-1.5 text-popover-foreground shadow-[0_30px_60px_-30px_rgba(20,33,61,0.55)] transition-[scale,opacity] duration-150 ease-out outline-none data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0">
            <p className="px-3 pt-1 pb-2 text-xs font-semibold text-muted-foreground">
              Move to
            </p>

            {sprints.map((sprint) => {
              const here = sprint.id === issue.sprint?.id

              return (
                <Menu.Item
                  key={sprint.id}
                  // Where it already is, so there is nothing to do. Shown
                  // rather than hidden, with a tick — the list is also how you
                  // see which sprint this issue is in.
                  disabled={here}
                  onClick={() => handleMove(sprint.id, sprint.name)}
                  className={itemClass}
                >
                  <Layers
                    className={cn(
                      "size-4 shrink-0",
                      here ? "text-secondary" : "text-muted-foreground"
                    )}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate">{sprint.name}</span>
                  {here && (
                    <Check
                      className="size-3.5 shrink-0 text-secondary"
                      aria-hidden="true"
                    />
                  )}
                </Menu.Item>
              )
            })}

            <Menu.Item
              disabled={issue.sprint === null}
              onClick={() => handleMove(null, "Uncategorized")}
              className={cn(itemClass, "mt-1 border-t border-border pt-2.5")}
            >
              <Inbox
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate">Uncategorized</span>
              {issue.sprint === null && (
                <Check
                  className="size-3.5 shrink-0 text-secondary"
                  aria-hidden="true"
                />
              )}
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}

const itemClass =
  "flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-primary transition-colors outline-none select-none data-disabled:cursor-default data-disabled:text-muted-foreground data-highlighted:bg-surface data-highlighted:data-disabled:bg-transparent"

export { MoveIssueMenu }
