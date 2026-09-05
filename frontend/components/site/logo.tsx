"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn, scrollBehavior } from "@/lib/utils"

/**
 * Poko wordmark: two offset estimation cards inside a rounded tile.
 * `tone` switches the wordmark for placement on light or navy backgrounds.
 */
function Logo({
  className,
  tone = "dark",
}: {
  className?: string
  tone?: "dark" | "light"
}) {
  const pathname = usePathname()

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    // Off the home page the link navigates as usual, and modified clicks
    // (new tab, new window) are always left alone.
    if (
      pathname !== "/" ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return
    }

    // Already home: return to the top instead of re-navigating to this page.
    event.preventDefault()
    window.scrollTo({ top: 0, behavior: scrollBehavior() })
  }

  return (
    <Link
      href="/"
      onClick={handleClick}
      aria-label="Poko home"
      className={cn(
        "group/logo inline-flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-secondary/50",
        className
      )}
    >
      <LogoMark className="size-8" />
      <span
        className={cn(
          "text-[1.375rem] leading-none font-semibold tracking-tight",
          tone === "light" ? "text-white" : "text-primary"
        )}
      >
        Poko
      </span>
    </Link>
  )
}

function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <rect
        x="7.5"
        y="9"
        width="10"
        height="14"
        rx="2.5"
        transform="rotate(-9 7.5 9)"
        className="fill-white/25"
      />
      <rect
        x="13"
        y="8"
        width="11"
        height="16"
        rx="3"
        className="fill-secondary"
      />
      <path
        d="M17 19v-6.2h2.6a1.9 1.9 0 0 1 0 3.8H17"
        className="stroke-primary"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export { Logo, LogoMark }
