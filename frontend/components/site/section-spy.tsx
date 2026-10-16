"use client"

import { useEffect } from "react"

type SectionSpyProps = {
  /** Only sections with a nav link. Anywhere else clears the hash. */
  ids: readonly string[]
}

/**
 * Keeps the hash naming the section on screen, which is what keeps the nav
 * links working: Next only scrolls when the hash actually CHANGES (see
 * `onlyHashChange` in segment-cache/navigation.js), so once the URL says
 * `#features` that link is dead until something clears it. replaceState, not
 * push — a scroll is not a destination.
 */
function SectionSpy({ ids }: SectionSpyProps) {
  // Joined so an inline array literal does not re-run the effect.
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
      // Highest in the viewport wins; usually only one is in the band.
      let next: string | null = null
      let highest = Infinity

      for (const node of inBand) {
        const { top } = node.getBoundingClientRect()
        if (top < highest) {
          highest = top
          next = node.id
        }
      }

      // The first callback fires on observe, before a deep link has scrolled.
      // Writing then would blank its hash, so only record where we are.
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
      // A band, not the whole viewport: every tall section would otherwise
      // count as visible at once. 15% is wide enough not to skip a seam.
      { rootMargin: "-15% 0px -70% 0px" }
    )

    sections.forEach((section) => observer.observe(section))

    return () => observer.disconnect()
  }, [key])

  return null
}

export { SectionSpy }
