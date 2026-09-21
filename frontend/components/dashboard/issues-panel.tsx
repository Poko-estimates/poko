"use client"

import { startTransition, useOptimistic, useRef } from "react"
import Link from "next/link"
import { CheckCircle2, GripVertical, Inbox, Layers, Plus } from "lucide-react"

import { ClearIssuesMenu } from "@/components/dashboard/clear-issues-menu"
import { DeleteIssueDialog } from "@/components/dashboard/delete-issue-dialog"
import { EditIssueButton } from "@/components/dashboard/edit-issue-button"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { reorderIssues } from "@/lib/issues/actions"
import type { Issue, Sprint } from "@/lib/issues/model"
import { useDragOrder } from "@/lib/issues/use-drag-order"
import { cn } from "@/lib/utils"

/** The id the Uncategorized group goes under. No sprint has an empty id. */
const uncategorized = ""

type Group = {
  id: string
  name: string
  issues: Issue[]
}

/**
 * Splits the list into sprint cards, keeping each sprint's issues in the order
 * the list already had them.
 *
 * Sprints appear in the order their first issue does, so the arrangement you
 * dragged decides which card is on top as well as what sits inside it — rather
 * than a second, invisible rule about sprints competing with it. Uncategorized
 * always sinks to the bottom: it is where things land when nobody has filed
 * them, not a sprint the team is working on.
 */
function groupBySprint(issues: Issue[]): Group[] {
  const groups = new Map<string, Group>()

  for (const issue of issues) {
    const id = issue.sprint?.id ?? uncategorized
    const existing = groups.get(id)

    if (existing) {
      existing.issues.push(issue)
      continue
    }

    groups.set(id, {
      id,
      name: issue.sprint?.name ?? "Uncategorized",
      issues: [issue],
    })
  }

  return [...groups.values()].sort((a, b) => {
    if (a.id === uncategorized) return 1
    if (b.id === uncategorized) return -1
    return 0
  })
}

/**
 * The issue list, grouped into the sprint each issue is being refined in.
 *
 * Selection lives in the URL rather than in component state, so it survives a
 * reload, can be linked to, and lets the server render the room for the chosen
 * issue. The ORDER is the other way round — it lives in the database, per
 * viewer, because it has to outlive the tab and follow you to another device.
 */
function IssuesPanel({
  activeSlug,
  issues,
  onCreate,
  sprints,
}: {
  activeSlug: string | null
  issues: Issue[]
  onCreate: () => void
  sprints: Sprint[]
}) {
  const toast = useToast()
  const open = issues.filter((issue) => issue.status === "voting").length

  // The optimistic base is the server's order, so a revalidation landing
  // mid-transition re-runs this on top of the fresh list rather than fighting
  // it — and a rejected save needs no rollback code, because React drops back
  // to the base on its own. Same reasoning as the vote in `session-room`.
  const [optimisticIds, setOptimisticIds] = useOptimistic(
    issues.map((issue) => issue.id)
  )

  const byId = new Map(issues.map((issue) => [issue.id, issue]))

  // Reconciled rather than trusted: during a transition the optimistic list is
  // the pre-save order, so an issue created in another tab in that window is
  // absent from it. Appending the strays keeps every issue on screen.
  const ordered = [
    ...optimisticIds.flatMap((id) => byId.get(id) ?? []),
    ...issues.filter((issue) => !optimisticIds.includes(issue.id)),
  ]

  const groups = groupBySprint(ordered)

  /**
   * Folds one sprint's new internal order back into the whole list.
   *
   * `reorder_issues` stores one flat sequence per viewer, and grouping is a
   * rendering decision on top of it — so a drag inside a sprint has to be
   * expressed as a change to that one sequence. Every slot a member of the
   * group occupied is refilled, in order, from the group's new arrangement;
   * everything else stays exactly where it was. That holds even when a
   * sprint's issues are not next to each other in the flat order.
   */
  function handleGroupReorder(group: Group, nextIds: string[]) {
    const members = new Set(group.issues.map((issue) => issue.id))
    const queue = [...nextIds]

    const next = ordered.map((issue) =>
      members.has(issue.id) ? (queue.shift() ?? issue.id) : issue.id
    )

    startTransition(async () => {
      setOptimisticIds(next)

      const result = await reorderIssues(next)

      // Worth saying out loud: the list snaps back to the server's order on
      // its own, which without an explanation just looks like the drop
      // didn't take.
      if (result.formError) {
        toast.add({
          type: "error",
          title: "Couldn't save that order",
          description: result.formError,
        })
      }
    })
  }

  return (
    <aside className="lg:sticky lg:top-6 lg:w-80 lg:shrink-0">
      <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-primary">Issues</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {issues.length === 0
                ? "Nothing on the table yet"
                : `${issues.length} across ${countOf(groups.length, "sprint")} · ${open} still voting`}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button type="button" variant="secondary" size="sm" onClick={onCreate}>
              <Plus className="size-3.5" aria-hidden="true" />
              New
            </Button>
            <ClearIssuesMenu issues={issues} activeSlug={activeSlug} />
          </div>
        </div>

        {issues.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-xs leading-relaxed text-muted-foreground">
            Create an issue to open the table.
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {groups.map((group) => (
                <SprintGroup
                  key={group.id}
                  group={group}
                  activeSlug={activeSlug}
                  sprints={sprints}
                  onReorder={(nextIds) => handleGroupReorder(group, nextIds)}
                />
              ))}
            </div>

            {ordered.length > 1 && (
              <p
                id={reorderHintId}
                className="px-1 text-xs leading-relaxed text-muted-foreground"
              >
                Drag a card to reorder it within its sprint, or press space on
                its handle and use the arrow keys. Use Edit to move an issue to
                a different sprint.
              </p>
            )}
          </>
        )}
      </div>
    </aside>
  )
}

/**
 * One sprint's card.
 *
 * Its own component because each card is a separate drag surface: the hook
 * measures the rows of one list, and a hook cannot be called in a loop. That
 * also makes a drag naturally sprint-bound — there is no gesture that could
 * carry a row out of its own card, so a drop can never silently refile an
 * issue. Moving between sprints is the edit dialog's job, where it is a
 * deliberate choice rather than a slip of the wrist.
 */
function SprintGroup({
  activeSlug,
  group,
  onReorder,
  sprints,
}: {
  activeSlug: string | null
  group: Group
  onReorder: (nextIds: string[]) => void
  sprints: Sprint[]
}) {
  const listRef = useRef<HTMLUListElement>(null)
  const isUncategorized = group.id === uncategorized

  const order = useDragOrder({
    ids: group.issues.map((issue) => issue.id),
    labelFor: (id) =>
      group.issues.find((issue) => issue.id === id)?.name ?? "this issue",
    listRef,
    onReorder,
  })

  // One row cannot be reordered, and a handle that does nothing is worse than
  // no handle.
  const reorderable = group.issues.length > 1

  return (
    <section className="rounded-2xl border border-border bg-surface/60 p-2">
      <h3 className="flex items-center gap-1.5 px-1.5 pt-0.5 pb-2">
        {isUncategorized ? (
          <Inbox
            className="size-3.5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        ) : (
          <Layers className="size-3.5 shrink-0 text-secondary" aria-hidden="true" />
        )}
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-xs font-semibold",
            isUncategorized ? "text-muted-foreground" : "text-primary"
          )}
        >
          {group.name}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {group.issues.length}
        </span>
      </h3>

      <ul
        ref={listRef}
        {...order.listProps}
        className={cn(
          "flex flex-col gap-1.5",
          // `cursor` on the list alone loses to the rows' own link cursor, so
          // the grabbing hand has to be pushed down onto them.
          order.liftedId && "[&_a]:cursor-grabbing"
        )}
      >
        {group.issues.map((issue, index) => {
          const active = issue.slug === activeSlug
          const closed = issue.status === "closed"
          const lifted = order.liftedId === issue.id

          // The row's chrome lives on the <li>, so the handle and the delete
          // control can sit beside the link rather than inside it — nesting
          // one interactive element in another is invalid HTML and unusable by
          // keyboard.
          //
          // The press that may become a drag is caught here too, which is what
          // makes the whole card draggable and not just the handle; it only
          // commits to a drag once the pointer has moved, so a click still
          // opens the issue.
          return (
            <li
              key={issue.id}
              {...(reorderable ? order.rowProps(index) : {})}
              style={order.itemStyle(index)}
              className={cn(
                "flex items-stretch rounded-xl border",
                // Colour transitions only. `transition-all` here would ease
                // the transform too, and the lifted row has to track the
                // pointer exactly rather than trail it.
                "transition-colors",
                active
                  ? "border-secondary bg-secondary/10"
                  : "border-transparent bg-card hover:border-secondary/40",
                lifted &&
                  "border-secondary bg-card shadow-[0_12px_28px_-12px_rgba(20,33,61,0.45)]"
              )}
            >
              {reorderable && (
                <button
                  type="button"
                  {...order.handleProps(index)}
                  aria-label={`Reorder ${issue.name}`}
                  // The instructions belong on the control that takes the
                  // keys, so a screen reader reads them on focus rather than
                  // only after something has moved.
                  aria-describedby={reorderHintId}
                  className={cn(
                    "inline-flex w-5 shrink-0 items-center justify-center rounded-l-xl text-muted-foreground/50 transition-colors outline-none",
                    "hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50",
                    lifted ? "cursor-grabbing text-primary" : "cursor-grab"
                  )}
                >
                  <GripVertical className="size-3.5" aria-hidden="true" />
                </button>
              )}

              <Link
                href={`/dashboard?issue=${issue.slug}`}
                prefetch
                aria-current={active ? "true" : undefined}
                // Anchors are natively draggable, and that native drag would
                // hijack the gesture with a ghost of the link before this ever
                // sees a pointer move.
                draggable={false}
                className="min-w-0 flex-1 rounded-r-xl px-2.5 py-2.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {/* No flex-1 on the title: it shrinks to its content (still
                    truncating when long) so the played tick sits against the
                    text rather than drifting to the far edge. */}
                <span className="flex items-center gap-1.5">
                  {issue.key && (
                    <span className="shrink-0 font-mono text-[0.6875rem] font-semibold text-muted-foreground">
                      {issue.key}
                    </span>
                  )}
                  <span className="min-w-0 truncate text-sm font-medium text-primary">
                    {issue.name}
                  </span>
                  {closed && (
                    <CheckCircle2
                      className="size-3.5 shrink-0 text-secondary"
                      aria-hidden="true"
                    />
                  )}
                </span>

                <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="truncate">{issue.deckName}</span>
                  <span aria-hidden="true">·</span>
                  <span
                    className={cn(
                      "shrink-0 font-medium",
                      closed ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {closed
                      ? issue.estimate
                        ? `Saved ${issue.estimate}`
                        : "No consensus"
                      : "Voting"}
                  </span>
                </span>
              </Link>

              {issue.isOwner && (
                <>
                  <EditIssueButton issue={issue} sprints={sprints} />
                  <DeleteIssueDialog issue={issue} isActive={active} />
                </>
              )}
            </li>
          )
        })}
      </ul>

      {/* Announces the drag for anyone who cannot see it happening. Outside the
          list so reordering the rows cannot remount the live region, which
          would lose the message. */}
      <p aria-live="polite" role="status" className="sr-only">
        {order.announcement}
      </p>
    </section>
  )
}

function countOf(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`
}

const reorderHintId = "issue-reorder-hint"

export { IssuesPanel }
