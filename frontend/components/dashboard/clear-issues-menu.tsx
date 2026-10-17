"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Menu } from "@base-ui/react/menu"
import { CheckCheck, Ellipsis, Trash2 } from "lucide-react"

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { clearIssues, type ClearScope } from "@/lib/issues/actions"
import type { Issue } from "@/lib/issues/model"
import { cn } from "@/lib/utils"

/**
 * Bulk clearing for the issue list.
 *
 * Scoped to issues you OWN, in the menu and in the action both. The list you
 * are looking at includes issues you only have a seat at, and those are not
 * yours to delete — so the counts here deliberately do not match
 * `issues.length`, and the confirmation says which ones are being left alone
 * rather than letting you discover it afterwards.
 *
 * Both options destroy data for everyone at those tables, so each goes behind
 * the same alert dialog the single-row delete uses: a deliberate button press,
 * not a stray click on the backdrop.
 */
function ClearIssuesMenu({
  activeSlug,
  issues,
}: {
  activeSlug: string | null
  issues: Issue[]
}) {
  const router = useRouter()
  const toast = useToast()
  const [pending, startTransition] = useTransition()

  // Null means no confirmation is open. Holding the scope rather than a
  // separate boolean keeps "which one did they pick" and "is it open" from
  // ever disagreeing.
  const [confirming, setConfirming] = useState<ClearScope | null>(null)

  const mine = issues.filter((issue) => issue.isOwner)
  const voted = mine.filter((issue) => issue.status === "closed")
  const theirs = issues.length - mine.length

  // Nothing of yours to clear means nothing to offer. A menu of two disabled
  // items is just a dead end with extra steps.
  if (mine.length === 0) return null

  const targets = confirming === "voted" ? voted : mine

  function handleClear(scope: ClearScope) {
    startTransition(async () => {
      const cleared = scope === "voted" ? voted : mine
      const result = await clearIssues(scope)

      // Closes either way, and the outcome goes in a toast: leaving it open on
      // failure puts the error where the user is about to navigate away from.
      setConfirming(null)

      if (result.formError) {
        toast.add({
          type: "error",
          title: "Couldn't clear those issues",
          description: result.formError,
        })
        return
      }

      toast.add({
        type: "success",
        title: `Cleared ${countOf(result.cleared ?? 0)}`,
      })

      // Only navigate if what was open went with it — a clear that left the
      // open issue standing should not also close it.
      if (activeSlug && cleared.some((issue) => issue.slug === activeSlug)) {
        router.push("/dashboard")
      }
    })
  }

  return (
    <>
      <Menu.Root>
        <Menu.Trigger
          aria-label="Clear issues"
          className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors outline-none hover:bg-primary/5 hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:bg-primary/5 data-popup-open:text-primary"
        >
          <Ellipsis className="size-4" aria-hidden="true" />
        </Menu.Trigger>

        <Menu.Portal>
          <Menu.Positioner side="bottom" align="end" sideOffset={8} className="z-60">
            <Menu.Popup className="min-w-60 origin-[var(--transform-origin)] rounded-2xl border border-border bg-popover p-1.5 text-popover-foreground shadow-[0_30px_60px_-30px_rgba(20,33,61,0.55)] transition-[scale,opacity] duration-150 ease-out outline-none data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0">
              <Menu.Item
                disabled={voted.length === 0}
                onClick={() => setConfirming("voted")}
                className={itemClass}
              >
                <CheckCheck className="size-4 shrink-0" aria-hidden="true" />
                <span className="flex-1">Clear voted</span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {voted.length}
                </span>
              </Menu.Item>

              <Menu.Item
                onClick={() => setConfirming("all")}
                className={cn(itemClass, "text-destructive")}
              >
                <Trash2 className="size-4 shrink-0" aria-hidden="true" />
                <span className="flex-1">Clear all</span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {mine.length}
                </span>
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>

      <AlertDialog
        open={confirming !== null}
        onOpenChange={(open) => !open && setConfirming(null)}
      >
        <AlertDialogContent>
          <div className="flex flex-col gap-1.5">
            <AlertDialogTitle>
              {confirming === "voted"
                ? `Clear ${countOf(voted.length)} that have been voted on?`
                : `Clear all ${countOf(mine.length)}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirming === "voted"
                ? "Every issue you own whose round has closed will be removed, along with the estimate it settled on and every card played in it."
                : "Every issue you own will be removed, along with every card played in it — including rounds still open."}{" "}
              This affects everyone who was at those tables and cannot be
              undone.
              {theirs > 0 && (
                <>
                  {" "}
                  <span className="font-medium text-primary">
                    {countOf(theirs)} you only have a seat at
                  </span>{" "}
                  {theirs === 1 ? "is" : "are"} left alone.
                </>
              )}
            </AlertDialogDescription>
          </div>

          <AlertDialogFooter>
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={pending}
              onClick={() => setConfirming(null)}
            >
              Keep them
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="lg"
              disabled={pending}
              onClick={() => confirming && handleClear(confirming)}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              {pending ? "Clearing…" : `Clear ${targets.length}`}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function countOf(count: number) {
  return `${count} ${count === 1 ? "issue" : "issues"}`
}

const itemClass =
  "flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-primary transition-colors outline-none select-none data-disabled:cursor-not-allowed data-disabled:opacity-50 data-highlighted:bg-surface"

export { ClearIssuesMenu }
