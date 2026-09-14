import type { ReactNode } from "react"

import { Container } from "@/components/site/container"
import { Logo } from "@/components/site/logo"

/**
 * Chrome for the signed-in surfaces. The dashboard identifies you by email and
 * offers sign-out; a room identifies a guest by their display name and offers
 * them an account instead.
 */
function AppHeader({
  action,
  label,
}: {
  action?: ReactNode
  label?: string | null
}) {
  return (
    <header className="border-b border-border bg-background">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Logo />
        <div className="flex items-center gap-3">
          {label && (
            <span className="hidden max-w-56 truncate text-sm text-muted-foreground sm:block">
              {label}
            </span>
          )}
          {action}
        </div>
      </Container>
    </header>
  )
}

export { AppHeader }
