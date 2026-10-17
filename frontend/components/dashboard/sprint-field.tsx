"use client"

import { Combobox } from "@base-ui/react/combobox"
import { ChevronDown, Layers, Plus, X } from "lucide-react"

import { maxSprintNameLength } from "@/lib/decks"
import type { Sprint } from "@/lib/issues/model"
import { cn } from "@/lib/utils"

/**
 * The sprint an issue belongs to — picked from the ones you already have, or
 * created by typing a name that isn't there yet.
 *
 * The field's value is the sprint NAME, not an id. That is what lets one
 * control do both jobs: there is nothing to pick yet for a sprint you are
 * inventing as you type, and the action turns a name into a row (finding the
 * existing one or inserting it) where the uniqueness constraint lives.
 *
 * `filter={null}` turns off Base UI's own matching so the option list is
 * entirely ours — which is the only way to append an entry that is not a
 * sprint at all, but an offer to make one.
 */
function SprintField({
  onValueChange,
  sprints,
  value,
}: {
  onValueChange: (name: string) => void
  /** The sprints this person owns. Only their own can be filed into. */
  sprints: Sprint[]
  value: string
}) {
  const typed = value.trim()
  const wanted = typed.toLowerCase()

  const matching = sprints.filter((sprint) =>
    sprint.name.toLowerCase().includes(wanted)
  )
  const alreadyExists = sprints.some(
    (sprint) => sprint.name.toLowerCase() === wanted
  )

  // The typed name goes last, and only when it is not already a sprint — so
  // the list reads "here is what you have" before "or make this one".
  const options = matching.map((sprint) => sprint.name)
  if (typed && !alreadyExists) options.push(typed)

  return (
    <Combobox.Root
      items={options}
      filter={null}
      inputValue={value}
      onInputValueChange={onValueChange}
      // Also synced from the selection, so pressing an option commits its name
      // even where filling the input would not have raised a change.
      onValueChange={(next) =>
        onValueChange(typeof next === "string" ? next : "")
      }
    >
      <Combobox.InputGroup className="relative flex h-11 w-full items-center rounded-xl border border-input bg-card transition-colors focus-within:ring-3 focus-within:ring-ring/50">
        <Combobox.Input
          placeholder="Sprint 24"
          autoComplete="off"
          maxLength={maxSprintNameLength}
          className="h-full w-full rounded-xl bg-transparent pr-16 pl-3.5 text-sm text-primary outline-none placeholder:text-muted-foreground"
        />

        <div className="absolute right-1 flex items-center">
          {/* Clearing is how you say "no sprint" — the field is optional, and
              an issue with none shows under Uncategorized. */}
          <Combobox.Clear
            aria-label="Clear sprint"
            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <X className="size-4" aria-hidden="true" />
          </Combobox.Clear>
          <Combobox.Trigger
            aria-label="Show sprints"
            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <ChevronDown className="size-4" aria-hidden="true" />
          </Combobox.Trigger>
        </div>
      </Combobox.InputGroup>

      <Combobox.Portal>
        <Combobox.Positioner sideOffset={6} className="z-80 outline-none">
          <Combobox.Popup className="max-h-[min(18rem,var(--available-height))] w-[var(--anchor-width)] origin-[var(--transform-origin)] overflow-y-auto rounded-2xl border border-border bg-popover p-1.5 text-popover-foreground shadow-[0_30px_60px_-30px_rgba(20,33,61,0.55)] transition-[scale,opacity] duration-150 ease-out outline-none data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0">
            <Combobox.Empty className="px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
              {sprints.length === 0
                ? "No sprints yet — type a name to make your first one."
                : "Type a name to add a new sprint."}
            </Combobox.Empty>

            <Combobox.List>
              {(name: string) => {
                // The last entry can be the typed name rather than a sprint.
                // Compared against the real list rather than by position, so
                // it stays right however the options were assembled.
                const isNew = !sprints.some(
                  (sprint) => sprint.name.toLowerCase() === name.toLowerCase()
                )

                return (
                  <Combobox.Item
                    key={name}
                    value={name}
                    className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-primary transition-colors outline-none select-none data-highlighted:bg-surface"
                  >
                    {isNew ? (
                      <>
                        <Plus
                          className="size-4 shrink-0 text-secondary"
                          aria-hidden="true"
                        />
                        <span className="min-w-0 truncate">
                          Add &ldquo;{name}&rdquo; as a new sprint
                        </span>
                      </>
                    ) : (
                      <>
                        <Layers
                          className={cn("size-4 shrink-0 text-muted-foreground")}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 truncate">{name}</span>
                      </>
                    )}
                  </Combobox.Item>
                )
              }}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  )
}

export { SprintField }
