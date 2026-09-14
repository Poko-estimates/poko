import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

function SettingsSection({
  action,
  children,
  description,
  title,
  tone = "default",
}: {
  action?: ReactNode
  children: ReactNode
  description?: string
  title: string
  tone?: "default" | "danger"
}) {
  return (
    <section
      className={cn(
        "rounded-3xl border bg-card",
        tone === "danger" ? "border-destructive/30" : "border-border"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <h2
            className={cn(
              "text-base font-semibold tracking-tight",
              tone === "danger" ? "text-destructive" : "text-primary"
            )}
          >
            {title}
          </h2>
          {description && (
            <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {action}
      </div>

      <div className="px-5 py-5 sm:px-6">{children}</div>
    </section>
  )
}

function SettingsRow({
  children,
  label,
}: {
  children: ReactNode
  label: string
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border py-3 first:pt-0 last:border-0 last:pb-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm font-medium text-primary">{children}</dd>
    </div>
  )
}

export { SettingsRow, SettingsSection }
