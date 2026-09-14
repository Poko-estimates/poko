"use client"

import { useEffect, useRef } from "react"

import { EmojiPicker } from "@/components/ui/emoji-picker"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type EmojiInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onValueChange"
> & {
  value: string
  onValueChange: (value: string) => void
  /** Accessible name for the emoji trigger. */
  emojiLabel?: string
}

/** A text input with an emoji picker that inserts at the caret. */
function EmojiInput({
  className,
  emojiLabel,
  onValueChange,
  value,
  ...props
}: EmojiInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  // Where to put the caret once React has painted the inserted emoji.
  const caretRef = useRef<number | null>(null)

  useEffect(() => {
    const caret = caretRef.current
    if (caret === null) return

    caretRef.current = null
    inputRef.current?.focus()
    inputRef.current?.setSelectionRange(caret, caret)
  })

  function insert(emoji: string) {
    const input = inputRef.current
    // Without a live input (or a caret in it) the emoji simply goes on the end.
    const start = input?.selectionStart ?? value.length
    const end = input?.selectionEnd ?? start

    caretRef.current = start + emoji.length
    onValueChange(value.slice(0, start) + emoji + value.slice(end))
  }

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={value}
        onValueChange={onValueChange}
        className={cn("pr-11", className)}
        {...props}
      />
      <EmojiPicker
        onSelect={insert}
        label={emojiLabel}
        className="absolute top-1.5 right-1.5"
      />
    </div>
  )
}

export { EmojiInput }
