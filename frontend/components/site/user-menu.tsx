"use client"

import { useTransition } from "react"
import Link from "next/link"
import { Menu } from "@base-ui/react/menu"
import { LogOut, Settings } from "lucide-react"

import { signOut } from "@/lib/auth/actions"
import { cn } from "@/lib/utils"

/**
 * The avatar in the header, and the menu behind it.
 *
 * `Menu.LinkItem` for Settings rather than an Item with an onClick, so it is a
 * real anchor: middle-click and "open in new tab" work, and it prefetches.
 */
function UserMenu({
  displayName,
  email,
  initials,
}: {
  displayName: string
  email: string | null
  initials: string
}) {
  const [pending, startTransition] = useTransition()

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={`Account menu for ${displayName}`}
        className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground transition-[box-shadow,opacity] outline-none select-none hover:opacity-90 focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:ring-3 data-popup-open:ring-ring/50"
      >
        {initials}
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={8} className="z-60">
          <Menu.Popup className="min-w-56 origin-[var(--transform-origin)] rounded-2xl border border-border bg-popover p-1.5 text-popover-foreground shadow-[0_30px_60px_-30px_rgba(20,33,61,0.55)] transition-[scale,opacity] duration-150 ease-out outline-none data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0">
            {/* Who you're signed in as. The header no longer says it, so the
                menu has to. */}
            <div className="border-b border-border px-3 pt-2 pb-2.5">
              <p className="truncate text-sm font-semibold text-primary">
                {displayName}
              </p>
              {email && (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {email}
                </p>
              )}
            </div>

            <div className="pt-1.5">
              <Menu.LinkItem
                render={<Link href="/settings" prefetch />}
                className={itemClass}
              >
                <Settings className="size-4 text-muted-foreground" aria-hidden="true" />
                Settings
              </Menu.LinkItem>

              <Menu.Item
                disabled={pending}
                onClick={() =>
                  startTransition(async () => void (await signOut()))
                }
                className={cn(itemClass, "data-disabled:opacity-50")}
              >
                <LogOut className="size-4 text-muted-foreground" aria-hidden="true" />
                {pending ? "Signing out…" : "Log out"}
              </Menu.Item>
            </div>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}

const itemClass =
  "flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-primary transition-colors outline-none select-none data-highlighted:bg-surface"

export { UserMenu }
