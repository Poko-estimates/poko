"use client"

import { useId, useState, useTransition } from "react"
import { Form } from "@base-ui/react/form"
import { Radio } from "@base-ui/react/radio"
import { RadioGroup } from "@base-ui/react/radio-group"

import { FormAlert } from "@/components/auth/form-alert"
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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/toast"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import {
  deckPresets,
  maxDeckValues,
  maxKeyLength,
  maxSummaryLength,
  minDeckValues,
  parseDeckValues,
} from "@/lib/decks"
import { SprintField } from "@/components/dashboard/sprint-field"
import { createIssue, updateIssue } from "@/lib/issues/actions"
import type { Issue, Sprint } from "@/lib/issues/model"
import { cn } from "@/lib/utils"

const customDeckId = "custom"

/**
 * Preset lengths rather than a seconds input: no unit ambiguity, no validation
 * surface, and it matches how the deck is already chosen.
 */
const timeboxOptions = [
  { id: "60", label: "1 min", seconds: 60 },
  { id: "120", label: "2 min", seconds: 120 },
  { id: "300", label: "5 min", seconds: 300 },
  { id: "none", label: "No limit", seconds: null },
] as const

type IssueDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * The issue being edited. Absent means this is a new one — the only
   * difference between the two modes, besides which action runs.
   */
  issue?: Issue
  /** The sprints this person owns, for the sprint field to offer. */
  sprints: Sprint[]
  /** Called with the new issue's slug, on creation only. */
  onCreated?: (slug: string) => void
}

/** Which preset a deck corresponds to, or "custom" when it matches none. */
function deckIdFor(issue: Issue | undefined) {
  if (!issue) return deckPresets[0].id

  const preset = deckPresets.find(
    (option) =>
      option.name === issue.deck.name &&
      option.values.join("\u0000") === issue.deck.values.join("\u0000")
  )

  return preset?.id ?? customDeckId
}

function timeboxIdFor(issue: Issue | undefined) {
  const match = timeboxOptions.find(
    (option) => option.seconds === (issue?.timeboxSeconds ?? null)
  )

  return match?.id ?? "none"
}

/**
 * The dialog shell, which owns no form state at all.
 *
 * That split is the point. `IssueForm` lives inside `DialogContent`, and
 * `DialogPortal` does not keep its subtree mounted while the popup is hidden —
 * so the form is mounted fresh on every open and thrown away on every close.
 * Its `useState` initialisers therefore read the CURRENT issue each time,
 * which is what makes both modes correct without a line of reset logic:
 *
 *   * "New" always opens empty, even straight after creating something.
 *   * "Edit" always opens on the issue's latest details, even after a save or
 *     a rename that arrived by realtime.
 *
 * Resetting on close instead — the obvious alternative, since opening is not
 * observable from in here — cannot do both: it either blanks the edit form or
 * leaves the create form holding the last issue you made. Base UI unmounts
 * only after the exit transition, so the values also stay put while the dialog
 * fades rather than blanking out underneath it.
 */
function IssueDialog({
  issue,
  open,
  onCreated,
  onOpenChange,
  sprints,
}: IssueDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <IssueForm
          issue={issue}
          sprints={sprints}
          onClose={() => onOpenChange(false)}
          onCreated={onCreated}
        />
      </DialogContent>
    </Dialog>
  )
}

function IssueForm({
  issue,
  onClose,
  onCreated,
  sprints,
}: {
  issue?: Issue
  onClose: () => void
  onCreated?: (slug: string) => void
  sprints: Sprint[]
}) {
  const editing = issue !== undefined
  const deckLabelId = useId()
  const timeboxLabelId = useId()

  const toast = useToast()
  const [pending, startTransition] = useTransition()
  // Kept inline rather than toasted: these are about the fields in front of
  // you — a missing name, too few cards — so the message belongs beside them.
  const [formError, setFormError] = useState<string | null>(null)
  const [name, setName] = useState(issue?.name ?? "")
  const [key, setKey] = useState(issue?.key ?? "")
  const [sprintName, setSprintName] = useState(issue?.sprint?.name ?? "")
  const [summary, setSummary] = useState(issue?.summary ?? "")
  const [deckId, setDeckId] = useState<string>(() => deckIdFor(issue))
  const [timeboxId, setTimeboxId] = useState<string>(() => timeboxIdFor(issue))
  const [customName, setCustomName] = useState(
    deckIdFor(issue) === customDeckId ? (issue?.deck.name ?? "") : ""
  )
  const [customValues, setCustomValues] = useState(
    deckIdFor(issue) === customDeckId ? (issue?.deck.values.join(", ") ?? "") : ""
  )

  const isCustom = deckId === customDeckId
  const customCards = parseDeckValues(customValues)

  function handleSubmit() {
    const preset = deckPresets.find((option) => option.id === deckId)
    const timebox = timeboxOptions.find((option) => option.id === timeboxId)

    setFormError(null)

    const draft = {
      name: name.trim(),
      key: key.trim() || null,
      sprintName: sprintName.trim() || null,
      summary: summary.trim() || null,
      deck: preset
        ? { name: preset.name, values: preset.values }
        : { name: customName.trim(), values: customCards },
      timeboxSeconds: timebox?.seconds ?? null,
    }

    // The two modes are branched rather than sharing one result, because only
    // creation returns a slug and only creation navigates.
    startTransition(async () => {
      if (issue) {
        const result = await updateIssue(issue.id, draft)

        if (result.formError) {
          setFormError(result.formError)
          return
        }

        toast.add({ type: "success", title: `“${draft.name}” updated` })
        onClose()
        return
      }

      const result = await createIssue(draft)

      if (result.formError) {
        setFormError(result.formError)
        return
      }

      toast.add({
        type: "success",
        title: `“${draft.name}” is on the table`,
      })

      // Closed here rather than left to `onCreated`, which is optional — a
      // caller that only wants the toast should still get a dialog that shuts.
      onClose()
      if (result.slug) onCreated?.(result.slug)
    })
  }

  return (
    <Form className="flex min-h-0 flex-1 flex-col" onFormSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{editing ? "Edit issue" : "Create an issue"}</DialogTitle>
        <DialogDescription>
          {editing
            ? "Change the key, title, sprint, summary, deck or timebox."
            : "Name what you're estimating and choose the cards your team will vote with."}
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="flex flex-col gap-6">
        {formError && <FormAlert>{formError}</FormAlert>}

        {/* The key and the title on one row: together they are how the team
            refers to the ticket, and the key is short enough that giving it a
            full-width field would only look like a mistake. */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <Field name="issueKey" className="sm:w-40 sm:shrink-0">
            <FieldLabel>
              Key{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </FieldLabel>
            <Input
              value={key}
              onValueChange={setKey}
              placeholder="PK-231"
              autoComplete="off"
              maxLength={maxKeyLength}
            />
            <FieldDescription>From your tracker.</FieldDescription>
          </Field>

          <Field name="issueName" className="min-w-0 flex-1">
            <FieldLabel>Title</FieldLabel>
            <EmojiInput
              value={name}
              onValueChange={setName}
              placeholder="Add SSO for enterprise workspaces"
              emojiLabel="Add an emoji to the issue title"
              autoComplete="off"
              required
            />
            <FieldError match="valueMissing">
              Give the issue a title your team will recognise.
            </FieldError>
          </Field>
        </div>

        {/* Optional. An issue with no sprint groups under "Uncategorized"
            rather than being refused, so a quick one-off estimate does not
            have to become a planning exercise first. */}
        <Field name="sprint">
          <FieldLabel>
            Sprint{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </FieldLabel>
          <SprintField
            sprints={sprints}
            value={sprintName}
            onValueChange={setSprintName}
          />
          <FieldDescription>
            Pick one of yours, or type a new name to add it.
          </FieldDescription>
        </Field>

        {/* Optional, and next to the name because it answers the same
            question: what are we estimating? */}
        <Field name="summary">
          <FieldLabel>
            Summary{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </FieldLabel>
          <Textarea
            value={summary}
            onValueChange={setSummary}
            maxLength={maxSummaryLength}
            rows={3}
          />
          <FieldDescription>
            {summary.trim()
              ? `${maxSummaryLength - summary.trim().length} characters left`
              : "Skip it when the name says enough."}
          </FieldDescription>
        </Field>

        <div className="flex flex-col gap-2.5">
          <div>
            <p
              id={timeboxLabelId}
              className="text-sm font-medium text-primary"
            >
              Timebox
            </p>
          </div>

          <RadioGroup
            aria-labelledby={timeboxLabelId}
            value={timeboxId}
            onValueChange={(value) => setTimeboxId(String(value))}
            className="flex flex-wrap gap-2"
          >
            {timeboxOptions.map((option) => (
              <label
                key={option.id}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors",
                  timeboxId === option.id
                    ? "border-secondary bg-secondary/10 font-medium text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-secondary/50"
                )}
              >
                <Radio.Root
                  value={option.id}
                  className="flex size-4 shrink-0 items-center justify-center rounded-full border border-input bg-card transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 data-checked:border-secondary data-checked:bg-secondary"
                >
                  <Radio.Indicator className="size-1.5 rounded-full bg-primary data-unchecked:hidden" />
                </Radio.Root>
                {option.label}
              </label>
            ))}
          </RadioGroup>
        </div>

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
          disabled={pending}
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="secondary"
          size="xl"
          disabled={pending}
        >
          {pending
            ? editing
              ? "Saving…"
              : "Creating…"
            : editing
              ? "Save changes"
              : "Create issue"}
        </Button>
      </DialogFooter>
    </Form>
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

export { IssueDialog }
