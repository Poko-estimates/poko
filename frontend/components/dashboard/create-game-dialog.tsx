"use client"

import { useId, useState } from "react"
import { Form } from "@base-ui/react/form"
import { Radio } from "@base-ui/react/radio"
import { RadioGroup } from "@base-ui/react/radio-group"

import { DeckPreview } from "@/components/dashboard/deck-preview"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { EmojiInput } from "@/components/ui/emoji-input"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import {
  deckPresets,
  maxDeckValues,
  minDeckValues,
  parseDeckValues,
} from "@/lib/decks"
import type { GameDraft } from "@/lib/games"
import { cn } from "@/lib/utils"

const customDeckId = "custom"

type CreateGameDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (draft: GameDraft) => void
}

function CreateGameDialog({ open, onCreate, onOpenChange }: CreateGameDialogProps) {
  const deckLabelId = useId()

  const [name, setName] = useState("")
  const [deckId, setDeckId] = useState<string>(deckPresets[0].id)
  const [customName, setCustomName] = useState("")
  const [customValues, setCustomValues] = useState("")

  const isCustom = deckId === customDeckId
  const customCards = parseDeckValues(customValues)

  function handleOpenChange(next: boolean) {
    onOpenChange(next)

    if (!next) {
      setName("")
      setDeckId(deckPresets[0].id)
      setCustomName("")
      setCustomValues("")
    }
  }

  function handleSubmit() {
    const preset = deckPresets.find((option) => option.id === deckId)

    onCreate({
      name: name.trim(),
      deck: preset
        ? { name: preset.name, values: preset.values }
        : { name: customName.trim(), values: customCards },
    })

    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <Form
          className="flex min-h-0 flex-1 flex-col"
          onFormSubmit={handleSubmit}
        >
          <DialogHeader>
            <DialogTitle>Create a game</DialogTitle>
            <DialogDescription>
              Name the round and choose the cards your team will vote with.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="flex flex-col gap-6">
            <Field name="gameName">
              <FieldLabel>Game name</FieldLabel>
              <EmojiInput
                value={name}
                onValueChange={setName}
                placeholder="Sprint 24 refinement"
                emojiLabel="Add an emoji to the game name"
                autoComplete="off"
                required
              />
              <FieldError match="valueMissing">
                Give the game a name your team will recognise.
              </FieldError>
            </Field>

            <div className="flex flex-col gap-3">
              <div>
                <p
                  id={deckLabelId}
                  className="text-sm font-medium text-primary"
                >
                  Deck
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Every player gets the same hand. You can change it before the
                  first vote.
                </p>
              </div>

              <RadioGroup
                aria-labelledby={deckLabelId}
                value={deckId}
                onValueChange={(value) => setDeckId(String(value))}
                className="flex flex-col gap-2"
              >
                {deckPresets.map((preset) => (
                  <DeckOption
                    key={preset.id}
                    value={preset.id}
                    selected={deckId === preset.id}
                    title={preset.name}
                    tagline={preset.tagline}
                  >
                    <span className="mt-2.5 flex flex-wrap gap-1">
                      {preset.values.map((value) => (
                        <span
                          key={value}
                          className="rounded-md bg-primary/8 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-primary tabular-nums"
                        >
                          {value}
                        </span>
                      ))}
                    </span>
                  </DeckOption>
                ))}

                <DeckOption
                  value={customDeckId}
                  selected={isCustom}
                  title="Custom deck"
                  tagline="Write your own card faces — numbers, words or emoji."
                />
              </RadioGroup>

              {isCustom && (
                <div className="flex flex-col gap-4 rounded-2xl border border-secondary/40 bg-secondary/8 p-4">
                  <Field name="deckName">
                    <FieldLabel>Deck name</FieldLabel>
                    <EmojiInput
                      value={customName}
                      onValueChange={setCustomName}
                      placeholder="Confidence deck"
                      emojiLabel="Add an emoji to the deck name"
                      autoComplete="off"
                      required
                    />
                    <FieldError match="valueMissing">
                      Give the deck a name.
                    </FieldError>
                  </Field>

                  <Field
                    name="deckValues"
                    validate={(value) => {
                      const values = parseDeckValues(String(value ?? ""))

                      if (values.length < minDeckValues) {
                        return `Add at least ${minDeckValues} values, separated by commas.`
                      }
                      if (values.length > maxDeckValues) {
                        return `A deck holds up to ${maxDeckValues} values — this one has ${values.length}.`
                      }
                      return null
                    }}
                  >
                    <FieldLabel>Deck values</FieldLabel>
                    <EmojiInput
                      value={customValues}
                      onValueChange={setCustomValues}
                      placeholder="1, 2, 3, 5, 🚀, ☕"
                      emojiLabel="Add an emoji to the deck values"
                      autoComplete="off"
                    />
                    <FieldDescription>
                      Separate each card with a comma. Repeats are dropped.
                    </FieldDescription>
                    <FieldError />
                  </Field>

                  <div>
                    <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      Preview
                    </p>
                    <DeckPreview values={customCards} />
                  </div>
                </div>
              )}
            </div>
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="xl"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="secondary" size="xl">
              Create game
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

/** One selectable deck in the radio group. */
function DeckOption({
  children,
  selected,
  tagline,
  title,
  value,
}: {
  children?: React.ReactNode
  selected: boolean
  tagline: string
  title: string
  value: string
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer gap-3 rounded-2xl border p-4 transition-colors",
        selected
          ? "border-secondary bg-secondary/10"
          : "border-border bg-card hover:border-secondary/50 hover:bg-surface"
      )}
    >
      <Radio.Root
        value={value}
        className="mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-full border border-input bg-card transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 data-checked:border-secondary data-checked:bg-secondary"
      >
        <Radio.Indicator className="size-1.5 rounded-full bg-primary data-unchecked:hidden" />
      </Radio.Root>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-primary">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
          {tagline}
        </span>
        {children}
      </span>
    </label>
  )
}

export { CreateGameDialog }
