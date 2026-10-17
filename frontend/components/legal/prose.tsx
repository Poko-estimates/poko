import Link from "next/link"

import { cn } from "@/lib/utils"

/**
 * The handful of text shapes the legal pages need.
 *
 * These exist because there is no `@tailwindcss/typography` here and legal copy
 * is the one place in the app where a wall of unstyled paragraphs is a real
 * risk — three documents, dozens of blocks, each one an opportunity to reach
 * for a slightly different leading. Styling them once keeps the three
 * documents reading as one set.
 */

function P({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("leading-relaxed text-muted-foreground", className)}
      {...props}
    />
  )
}

function Bullets({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      className={cn(
        "flex flex-col gap-3 leading-relaxed text-muted-foreground",
        // Markers drawn with a pseudo-element rather than list-disc so they sit
        // on the first line's cap height instead of drifting with the text.
        "[&>li]:relative [&>li]:pl-6",
        "[&>li]:before:absolute [&>li]:before:top-[0.6em] [&>li]:before:left-1.5",
        "[&>li]:before:size-1.5 [&>li]:before:rounded-full [&>li]:before:bg-secondary",
        className
      )}
      {...props}
    />
  )
}

/**
 * Links inside a sentence. Underlined rather than coloured alone: these
 * documents are read at length, and colour on its own is not enough to mark a
 * link for a reader who cannot distinguish it (WCAG 1.4.1).
 */
const linkStyles =
  "rounded-sm font-medium text-primary underline underline-offset-4 transition-colors outline-none hover:text-secondary focus-visible:ring-3 focus-visible:ring-secondary/50"

function TextLink({ className, ...props }: React.ComponentProps<typeof Link>) {
  return <Link className={cn(linkStyles, className)} {...props} />
}

/** An address a reader is expected to write to, rendered as itself. */
function MailTo({ address }: { address: string }) {
  return (
    <a href={`mailto:${address}`} className={linkStyles}>
      {address}
    </a>
  )
}

/** A defined term or a literal value the reader may need to recognise. */
function Term({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn("font-medium text-primary", className)}
      {...props}
    />
  )
}

/**
 * A claim worth setting apart — typically one the database enforces, which is
 * the only kind of promise in these documents that is not just a promise.
 */
function Callout({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-border bg-surface px-5 py-5 text-sm leading-relaxed text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

/**
 * A plain two- or three-column table. Wrapped in its own scroll container so a
 * narrow screen scrolls the table rather than the whole page sideways.
 */
function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table
        className={cn(
          "w-full min-w-xl border-collapse text-left text-sm",
          "[&_th]:border-b [&_th]:border-border [&_th]:py-3 [&_th]:pr-6 [&_th]:align-bottom [&_th]:font-semibold [&_th]:text-primary",
          "[&_td]:border-b [&_td]:border-border [&_td]:py-3 [&_td]:pr-6 [&_td]:align-top [&_td]:leading-relaxed [&_td]:text-muted-foreground",
          "[&_tr>*:last-child]:pr-0",
          className
        )}
        {...props}
      />
    </div>
  )
}

export { Bullets, Callout, MailTo, P, Table, Term, TextLink }
