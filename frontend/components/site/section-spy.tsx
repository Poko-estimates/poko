"use client"

import { useEffect } from "react"

type SectionSpyProps = {
  /**
   * The sections that have a nav link pointing at them. Anywhere else on the
   * page — the hero, the integrations strip, the closing call to action —
   * deliberately has no hash, so the bare path means "not on a named section".
   */
  ids: readonly string[]
}

/**
 * Keeps the URL's hash describing the section you are actually looking at.
 *
 * This exists to fix a dead nav link, not for decoration. Next decides whether
 * a click is a hash navigation in `segment-cache/navigation.js`:
 *
 *   const onlyHashChange =
 *     url.pathname === oldUrl.pathname &&
 *     url.search   === oldUrl.search   &&
 *     url.hash     !== oldUrl.hash
 *
 * When the hash is unchanged that is false, the "hash-only navigations should
 * scroll" branch never runs, the route produced no new segments to scroll to,
 * and the click does nothing at all. So following /#features once and then
 * scrolling back up — with the wheel or the back-to-top button, neither of
 * which touches the hash — leaves that nav item permanently dead, because
 * every later click asks for the hash the URL already has.
 *
 * Writing the hash as you scroll removes the precondition rather than routing
 * around it: scroll away from Features and the hash stops saying `#features`,
 * so the next click is a genuine change and Next's own scroll handling runs.
 * It also stops the URL claiming `#features` while you are looking at the hero.
 *
 * `history.replaceState` is the documented way to do this — Next integrates
 * native pushState/replaceState into its router — and replace rather than push
 * matters: scrolling is not a destination, and Back should leave the page
 * rather than retrace a scroll.
 */
function SectionSpy({ ids }: SectionSpyProps) {
  // Joined so an inline array literal from the server component does not
  // re-run the effect on every render.
  const key = ids.join(",")

  useEffect(() => {
    const sections = key
      .split(",")
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => node !== null)

    if (sections.length === 0) return

    const inBand = new Set<Element>()
    let active = window.location.hash.slice(1) || null
    let primed = false

    function apply() {
      // Whichever qualifying section is highest in the viewport. Usually only
      // one is in the band at a time; this just settles the overlap.
      let next: string | null = null
      let highest = Infinity

      for (const node of inBand) {
        const { top } = node.getBoundingClientRect()
        if (top < highest) {
          highest = top
          next = node.id
        }
      }

      // The first callback fires on observe, before the browser has scrolled
      // to the fragment someone arrived on. Writing then would clear the hash
      // out of a deep link — /#pricing pasted into chat would land, blank its
      // own hash, and lose the scroll. So the first reading only records where
      // we are; every callback after it comes from real movement.
      if (!primed) {
        primed = true
        active = next
        return
      }

      if (next === active) return
      active = next

      window.history.replaceState(
        null,
        "",
        next
          ? `#${next}`
          : `${window.location.pathname}${window.location.search}`
      )
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) inBand.add(entry.target)
          else inBand.delete(entry.target)
        }
        apply()
      },
      // A band across the upper quarter of the viewport rather than the whole
      // of it: with no insets every tall section counts as visible at once and
      // the "current" one is whatever the tie-break says. Tall enough (15% of
      // the viewport) that the seam between two sections cannot fall through
      // it unnoticed.
      { rootMargin: "-15% 0px -70% 0px" }
    )

    sections.forEach((section) => observer.observe(section))

    return () => observer.disconnect()
  }, [key])

  return null
}

export { SectionSpy }
