"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { Check, Copy } from "lucide-react"

import { Button } from "@/components/ui/button"

/** The origin the page is served from — empty until the browser takes over. */
function useOrigin() {
  return useSyncExternalStore(
    // The origin can't change without a full navigation, so nothing to watch.
    () => () => {},
    () => window.location.origin,
    () => ""
  )
}

/** The room's shareable URL, with one-click copy. */
function InviteLink({ slug }: { slug: string }) {
  const origin = useOrigin()
  const [copied, setCopied] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!copied) return

    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  const link = `${origin}/room/${slug}`

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link)
      setFailed(false)
      setCopied(true)
    } catch {
      // The clipboard can be refused outright — an insecure origin, or a
      // permission the browser won't grant. Fall back to manual selection.
      setFailed(true)
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          readOnly
          value={link}
          aria-label="Invite link"
          onFocus={(event) => event.currentTarget.select()}
          className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-card px-3 font-mono text-xs text-muted-foreground transition-[color,border-color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
        />
        <Button type="button" variant="outline" size="lg" onClick={copyLink}>
          {copied ? (
            <Check className="size-4 text-secondary" aria-hidden="true" />
          ) : (
            <Copy className="size-4" aria-hidden="true" />
          )}
          {copied ? "Copied" : "Copy link"}
        </Button>
      </div>

      {failed && (
        <p className="mt-1.5 text-xs font-medium text-destructive">
          Couldn&apos;t reach the clipboard — select the link and copy it
          manually.
        </p>
      )}
    </div>
  )
}

export { InviteLink }
