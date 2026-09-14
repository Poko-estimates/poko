import type { ReactNode } from "react"

import { Container } from "@/components/site/container"
import { Logo } from "@/components/site/logo"

/**
 * Chrome for the signed-in surfaces.
 *
 * Identity lives in the avatar menu on the right rather than spelled out here
 * — `action` is that menu on the dashboard and in a room, and something else
 * (an invitation to make an account) for a guest.
 */
function AppHeader({ action }: { action?: ReactNode }) {
  return (
    <header className="border-b border-border bg-background">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Logo />
        {action}
      </Container>
    </header>
  )
}

export { AppHeader }
