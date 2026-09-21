"use client"

import { useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Plus, Spade } from "lucide-react"

import { IssueDialog } from "@/components/dashboard/issue-dialog"
import { IssuesPanel } from "@/components/dashboard/issues-panel"
import { Button } from "@/components/ui/button"
import type { Issue, Sprint } from "@/lib/issues/model"

/**
 * Layout and dialog state only. The issues list and the room itself are read on
 * the server and arrive as props and `children`, so this owns no data — the URL
 * decides which issue is open and the database decides what it contains.
 */
function DashboardShell({
  activeSlug,
  children,
  issues,
  sprints,
}: {
  activeSlug: string | null
  children: ReactNode
  issues: Issue[]
  sprints: Sprint[]
}) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          {issues.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border bg-card px-6 py-16 text-center">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-secondary/15 text-secondary">
                <Spade className="size-6" aria-hidden="true" />
              </span>
              <div className="max-w-sm">
                <h2 className="text-lg font-semibold tracking-tight text-primary">
                  No issue on the table yet
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  Name an issue and pick a deck — Fibonacci, t-shirt sizes, powers
                  of two, or a set of cards you write yourself.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="xl"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="size-4" aria-hidden="true" />
                Create an issue
              </Button>
            </div>
          ) : (
            children
          )}
        </div>

        <IssuesPanel
          issues={issues}
          sprints={sprints}
          activeSlug={activeSlug}
          onCreate={() => setDialogOpen(true)}
        />
      </div>

      <IssueDialog
        sprints={sprints}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={(slug) => {
          setDialogOpen(false)
          router.push(`/dashboard?issue=${slug}`)
        }}
      />
    </>
  )
}

export { DashboardShell }
