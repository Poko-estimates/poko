import Link from "next/link"

import { cn } from "@/lib/utils"

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
  return (
    <Link
      href="/"
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
