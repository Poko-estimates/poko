"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import type { EmojiStyle, Theme } from "emoji-picker-react"
import { Smile } from "lucide-react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

const pickerHeight = 400

/**
 * The picker ships the whole emoji dataset, and it only ever renders inside an
 * open popover — so it stays out of the initial bundle.
 */
const Picker = dynamic(() => import("emoji-picker-react"), {
  loading: () => <div style={{ height: pickerHeight }} />,
})

// `Theme` and `EmojiStyle` are runtime enums: importing them for their values
// would pull the picker back into the initial bundle, so the literals behind
// them are asserted instead.
const pickerTheme = "light" as Theme
const nativeEmoji = "native" as EmojiStyle

/** Repaints the picker in the Poko palette. */
const pickerVariables = {
  "--epr-emoji-size": "26px",
  "--epr-bg-color": "var(--card)",
  "--epr-text-color": "var(--foreground)",
  "--epr-picker-border-color": "transparent",
  "--epr-picker-border-radius": "0",
  "--epr-highlight-color": "var(--secondary)",
  "--epr-hover-bg-color": "color-mix(in oklab, var(--secondary) 22%, #fff)",
  "--epr-focus-bg-color": "color-mix(in oklab, var(--secondary) 22%, #fff)",
  "--epr-search-input-bg-color": "var(--muted)",
  "--epr-search-input-text-color": "var(--foreground)",
  "--epr-search-input-placeholder-color": "var(--muted-foreground)",
  "--epr-search-border-color": "var(--input)",
  "--epr-search-border-color-active": "var(--secondary)",
  "--epr-search-input-border-radius": "0.75rem",
  "--epr-search-input-height": "38px",
  "--epr-category-label-bg-color": "var(--card)",
  "--epr-category-label-text-color": "var(--muted-foreground)",
  "--epr-category-icon-active-color": "var(--secondary)",
} as React.CSSProperties

type EmojiPickerProps = {
  onSelect: (emoji: string) => void
  /** Accessible name for the trigger, e.g. "Add an emoji to the deck name". */
  label?: string
  className?: string
}

/** An emoji browser in a popover. Picking one inserts it and closes the popover. */
function EmojiPicker({
  onSelect,
  label = "Add an emoji",
  className,
}: EmojiPickerProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        aria-label={label}
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors outline-none hover:bg-primary/5 hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:bg-primary/5 data-popup-open:text-primary",
          className
        )}
      >
        <Smile className="size-4.5" aria-hidden="true" />
      </PopoverTrigger>

      <PopoverContent
        align="end"
        // The picker draws its own chrome, so the popup only supplies the frame.
        className="w-auto overflow-hidden p-0"
        aria-label="Emoji picker"
      >
        <Picker
          theme={pickerTheme}
          // Native glyphs render instantly and are exactly what gets inserted.
          emojiStyle={nativeEmoji}
          // Focus is handled by the popover, which lands on the search input.
          autoFocusSearch={false}
          searchPlaceholder="Search emoji"
          previewConfig={{ showPreview: false }}
          width="min(20rem, calc(100vw - 2.5rem))"
          height={pickerHeight}
          style={pickerVariables}
          onEmojiClick={(emoji) => {
            onSelect(emoji.emoji)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

export { EmojiPicker }
