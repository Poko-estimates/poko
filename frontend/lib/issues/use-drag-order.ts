"use client"

import {
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type RefObject,
} from "react"

/**
 * Drag-to-reorder for a vertical list, by pointer or by keyboard.
 *
 * Hand-rolled rather than pulled from a library because the list is one column
 * of a handful of rows, and the whole job is the ~100 lines of geometry below
 * — a drag library would be the largest dependency in the project for it.
 *
 * THE DOM ORDER NEVER CHANGES MID-DRAG. The lifted row is moved with a
 * transform and the rows it displaces slide out of its way; only the drop
 * rewrites the list. Two things fall out of that, and both are the reason it
 * is built this way rather than by re-rendering into the projected order:
 *
 *   * Nothing reflows, so the row geometry measured once at lift stays true
 *     for the whole gesture — which is what lets the drop index be computed
 *     from real row centres instead of an assumed uniform row height.
 *   * The row keeps its identity in the DOM, so a handle being driven by the
 *     keyboard cannot lose focus to a node being reparented underneath it.
 *
 * Pointer and keyboard therefore share all of their state and differ in one
 * place: what sets the offset. A finger sets it directly; an arrow key sets it
 * to whatever lands the row exactly in the slot it is moving to.
 *
 * The keyboard model is lift/move/drop (space to pick up, arrows to move,
 * space to drop, escape to cancel) rather than "arrows reorder immediately",
 * so that holding an arrow key cannot fire a save per repeat: one gesture, one
 * write.
 */

/** A row's geometry at the moment of lift. */
type Row = {
  top: number
  bottom: number
  height: number
  center: number
}

type Drag = {
  id: string
  from: number
  to: number
  /** Where the pointer grabbed, or null for a keyboard lift. */
  pointerStartY: number | null
  /** How far the lifted row has moved from its own slot. */
  offset: number
  /** How far a displaced row moves: the lifted row's height plus the row gap. */
  stride: number
  rows: Row[]
  minOffset: number
  maxOffset: number
}

/**
 * Nothing ref-like comes back out of the hook, which is why `listRef` goes in
 * rather than out: a returned object holding a ref reads to the compiler's
 * ref-tracking as a ref itself, and every render-time use of the rest of it
 * then trips "cannot access refs during render".
 */
type DragOrder = {
  /**
   * For the list element. Every pointer move and release is tracked here
   * rather than on the row that was pressed, because until the gesture is
   * known to be a drag there is no pointer capture to retarget them — and a
   * quick flick can leave the row before its first move event lands. The list
   * spans every row, so it catches those.
   */
  listProps: {
    onPointerDownCapture: () => void
    onPointerMove: (event: PointerEvent<HTMLElement>) => void
    onPointerUp: () => void
    onPointerCancel: () => void
    onClickCapture: (event: MouseEvent) => void
    style: CSSProperties
  }
  /** Props for the row at `index` — a press anywhere on it may become a drag. */
  rowProps: (index: number) => {
    onPointerDown: (event: PointerEvent<HTMLElement>) => void
  }
  /** Props for the row's explicit drag handle, which also takes the keyboard. */
  handleProps: (index: number) => {
    onPointerDown: (event: PointerEvent<HTMLElement>) => void
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => void
    onBlur: () => void
    style: CSSProperties
  }
  /** Style for the row at `index` — its transform, while a drag is running. */
  itemStyle: (index: number) => CSSProperties
  /** The id currently lifted, by either input, or null. */
  liftedId: string | null
  /** What a screen reader should hear about the drag in progress. */
  announcement: string
}

/**
 * How far a press has to travel before it stops being a click and becomes a
 * drag. The row is a link, so this number is the whole reason both gestures
 * can live on it: below it the click navigates, above it the drag takes over
 * and the click is swallowed.
 */
const dragThreshold = 5

/** A press that has not yet travelled far enough to be a drag. */
type Press = {
  index: number
  pointerId: number
  x: number
  y: number
}

function useDragOrder({
  ids,
  labelFor,
  listRef,
  onReorder,
}: {
  ids: string[]
  /** Names an item in the live-region announcements. */
  labelFor: (id: string) => string
  /** The list element, so a lift can measure the rows it is about to move. */
  listRef: RefObject<HTMLUListElement | null>
  /** Called once per completed gesture, and never for a no-op move. */
  onReorder: (next: string[]) => void
}): DragOrder {
  const [drag, setDrag] = useState<Drag | null>(null)
  const [announcement, setAnnouncement] = useState("")

  // Refs, not state: a press that never becomes a drag must not cost a render,
  // and every plain click on a row goes through here.
  const press = useRef<Press | null>(null)
  const swallowClick = useRef(false)

  /**
   * Measures the list and opens a drag on the row at `index`.
   *
   * Returns null when there is nothing to reorder, which is also what keeps a
   * second pointer from joining a drag that is already running.
   */
  function lift(index: number, pointerStartY: number | null): Drag | null {
    const list = listRef.current
    if (drag || !list || ids.length < 2) return null

    const measured = [...list.children].map((row) => {
      const rect = row.getBoundingClientRect()
      return {
        top: rect.top,
        bottom: rect.bottom,
        height: rect.height,
        center: rect.top + rect.height / 2,
      }
    })

    const grabbed = measured[index]
    if (!grabbed) return null

    // Derived from the rendered rows rather than hardcoded, so changing the
    // list's `gap-*` class cannot silently desynchronise the shift distance.
    const gap =
      measured.length > 1 ? measured[1].top - measured[0].bottom : 0

    return {
      id: ids[index],
      from: index,
      to: index,
      pointerStartY,
      offset: 0,
      stride: grabbed.height + gap,
      rows: measured,
      // A row cannot be dragged out of its own list.
      minOffset: measured[0].top - grabbed.top,
      maxOffset: measured[measured.length - 1].bottom - grabbed.bottom,
    }
  }

  /**
   * Commits a finished gesture.
   *
   * Refuses when the row is no longer where it was picked up from: a
   * revalidation can land mid-drag, and the geometry — and `from` with it —
   * describes a list that no longer exists. Abandoning is the safe answer,
   * because committing would move whichever row inherited that slot.
   */
  function drop(finished: Drag) {
    setDrag(null)

    if (ids[finished.from] !== finished.id || finished.from === finished.to) {
      return
    }

    onReorder(move(ids, finished.from, finished.to))
  }

  /** Where the lifted row has to sit to land exactly in slot `to`. */
  function offsetForSlot(rows: Row[], from: number, to: number) {
    if (to === from) return 0

    // Moving down, the row's BOTTOM lines up with the bottom of the row it
    // passed; moving up, its TOP lines up with that row's top. Derived from
    // the measurements rather than `(to - from) * stride` so rows of
    // different heights still land flush.
    return to > from
      ? rows[to].bottom - rows[from].height - rows[from].top
      : rows[to].top - rows[from].top
  }

  /** Opens a drag and takes the pointer with it. Shared by both press paths. */
  function begin(next: Drag, event: PointerEvent<HTMLElement>) {
    // Captured on the LIST, not the pressed row: the row moves under the
    // pointer, and capturing the thing that moves would be asking for the
    // stream to follow it rather than the finger.
    listRef.current?.setPointerCapture(event.pointerId)

    // A drop is not a navigation, and the row is a link.
    swallowClick.current = true
    // Whatever few pixels of text the press selected on its way past the
    // threshold would otherwise stay highlighted for the whole drag.
    window.getSelection()?.removeAllRanges()

    setDrag(next)
    setAnnouncement(
      `Picked up ${labelFor(next.id)}, position ${next.from + 1} of ${ids.length}.`
    )
  }

  /**
   * Clears the swallow flag at the start of every press, in the capture phase
   * so it lands before either pointerdown handler below can set it.
   *
   * It is the safety net for a drag whose click never arrived — released off
   * the window, say — which would otherwise leave the flag armed and eat the
   * next genuine click on the list.
   */
  function handlePointerDownCapture() {
    swallowClick.current = false
  }

  /**
   * A press on the row itself. Becomes a drag only once it has travelled
   * `dragThreshold`, so a plain click still opens the issue.
   */
  function handleRowPointerDown(index: number) {
    return (event: PointerEvent<HTMLElement>) => {
      press.current = null

      if (event.button !== 0 || drag) return

      // The handle runs its own immediate drag, and the edit and delete
      // controls are not drag surfaces at all.
      if ((event.target as HTMLElement).closest("button")) return

      // Touch is left alone so the list can still be scrolled. `touch-action`
      // is fixed for the whole gesture at the moment it starts, so a
      // drag-anywhere card could only work by giving up scrolling over it —
      // touch drags from the handle, which does opt out.
      if (event.pointerType === "touch") return

      press.current = {
        index,
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      }
    }
  }

  /** A press on the handle. Lifts at once — that is what a handle is for. */
  function handlePointerDown(index: number) {
    return (event: PointerEvent<HTMLElement>) => {
      // Primary button only. Touch and pen both report 0 here.
      if (event.button !== 0 || drag) return

      const next = lift(index, event.clientY)
      if (!next) return

      // Focus the handle by hand: preventDefault stops the browser doing it,
      // and we want it focused so the gesture can be finished by keyboard.
      event.preventDefault()
      event.currentTarget.focus()

      begin(next, event)
    }
  }

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    if (!drag) {
      maybeBeginRowDrag(event)
      return
    }

    if (drag.pointerStartY === null) return

    const offset = clamp(
      event.clientY - drag.pointerStartY,
      drag.minOffset,
      drag.maxOffset
    )

    // Walk out from the lifted row's own slot until its centre no longer
    // passes a neighbour's. Neighbour by neighbour rather than one division,
    // so rows of different heights land in the slot they look like they are in.
    const center = drag.rows[drag.from].center + offset
    let to = drag.from
    while (to > 0 && center < drag.rows[to - 1].center) to -= 1
    while (to < drag.rows.length - 1 && center > drag.rows[to + 1].center) to += 1

    if (offset === drag.offset && to === drag.to) return
    setDrag({ ...drag, offset, to })
  }

  /**
   * Promotes a still-undecided press into a drag, once it has moved far
   * enough. Measuring here rather than at press time is deliberate: nothing
   * has reflowed in between, so the rows read the same, and a plain click
   * costs no layout work at all.
   */
  function maybeBeginRowDrag(event: PointerEvent<HTMLElement>) {
    const start = press.current
    if (!start || event.pointerId !== start.pointerId) return

    const travelled = Math.hypot(
      event.clientX - start.x,
      event.clientY - start.y
    )
    if (travelled < dragThreshold) return

    press.current = null

    // Measured from where the press STARTED, not from here, so the row sits
    // under the pointer rather than jumping by the threshold.
    const next = lift(start.index, start.y)
    if (next) begin(next, event)
  }

  function handlePointerUp() {
    press.current = null
    if (!drag || drag.pointerStartY === null) return

    setAnnouncement(
      `${labelFor(drag.id)} dropped at position ${drag.to + 1} of ${ids.length}.`
    )
    drop(drag)
  }

  /** A cancelled pointer (a system gesture, a lost device) is not a drop. */
  function handlePointerCancel() {
    press.current = null
    if (!drag || drag.pointerStartY === null) return

    setDrag(null)
    setAnnouncement(`Reordering cancelled — ${labelFor(drag.id)} stayed put.`)
  }

  /**
   * Eats the click that a completed drag would otherwise end in.
   *
   * Capture phase on the list, so it runs before the row's own link handler
   * and can stop the event reaching it at all — preventDefault alone would
   * stop the browser navigating but not Next's client-side router.
   */
  function handleClickCapture(event: MouseEvent) {
    if (!swallowClick.current) return

    swallowClick.current = false
    event.preventDefault()
    event.stopPropagation()
  }

  function handleKeyDown(index: number) {
    return (event: KeyboardEvent<HTMLElement>) => {
      // A pointer drag owns the gesture until it ends.
      if (drag && drag.pointerStartY !== null) return

      const isLiftKey = event.key === " " || event.key === "Enter"

      if (!drag) {
        if (!isLiftKey) return

        const next = lift(index, null)
        if (!next) return

        // Stops the button firing a click, and stops space scrolling the page.
        event.preventDefault()
        setDrag(next)
        setAnnouncement(
          `Picked up ${labelFor(next.id)}, position ${index + 1} of ${ids.length}. ` +
            "Use the arrow keys to move it, space to drop it, escape to cancel."
        )
        return
      }

      if (isLiftKey) {
        event.preventDefault()
        setAnnouncement(
          `${labelFor(drag.id)} dropped at position ${drag.to + 1} of ${ids.length}.`
        )
        drop(drag)
        return
      }

      if (event.key === "Escape") {
        event.preventDefault()
        setDrag(null)
        setAnnouncement(
          `Reordering cancelled — ${labelFor(drag.id)} is back at position ${drag.from + 1}.`
        )
        return
      }

      const step =
        event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0
      if (step === 0) return

      event.preventDefault()

      const to = drag.to + step
      if (to < 0 || to >= drag.rows.length) return

      setDrag({ ...drag, to, offset: offsetForSlot(drag.rows, drag.from, to) })
      setAnnouncement(
        `${labelFor(drag.id)} is now at position ${to + 1} of ${ids.length}.`
      )
    }
  }

  /**
   * Tabbing away mid-lift drops rather than cancels. Losing an arrangement
   * because focus moved would be the more annoying of the two, and escape is
   * still there for someone who wants to abandon it.
   */
  function handleBlur() {
    if (drag && drag.pointerStartY === null) drop(drag)
  }

  const byPointer = drag !== null && drag.pointerStartY !== null

  return {
    liftedId: drag?.id ?? null,
    announcement,
    listProps: {
      onPointerDownCapture: handlePointerDownCapture,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
      onClickCapture: handleClickCapture,
      style: byPointer
        ? { cursor: "grabbing", userSelect: "none" }
        : {},
    },
    rowProps: (index) => ({
      onPointerDown: handleRowPointerDown(index),
    }),
    handleProps: (index) => ({
      onPointerDown: handlePointerDown(index),
      onKeyDown: handleKeyDown(index),
      onBlur: handleBlur,
      // Without this, a touch drag scrolls the page instead of moving the row.
      // The card body deliberately does NOT opt out, so the list still scrolls.
      style: { touchAction: "none" },
    }),
    itemStyle: (index) => {
      if (!drag) return {}

      if (index === drag.from) {
        return {
          transform: `translateY(${drag.offset}px)`,
          // A pointer drag must track the finger exactly, so easing would only
          // make it lag. A keyboard move jumps a whole slot at once, and there
          // the same easing the displaced rows use is what shows what moved.
          transition: drag.pointerStartY === null ? shift : "none",
          position: "relative",
          zIndex: 1,
        }
      }

      const displaced =
        drag.to > drag.from && index > drag.from && index <= drag.to
          ? -drag.stride
          : drag.to < drag.from && index >= drag.to && index < drag.from
            ? drag.stride
            : 0

      return { transform: `translateY(${displaced}px)`, transition: shift }
    },
  }
}

const shift = "transform 150ms ease"

/** Pulls `from` out of the list and puts it back at `to`. */
function move<T>(items: T[], from: number, to: number): T[] {
  const next = [...items]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)

  return next
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export { useDragOrder }
