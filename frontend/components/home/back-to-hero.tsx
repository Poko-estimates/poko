"use client"

import { useEffect, useState } from "react"
import { ArrowUp } from "lucide-react"

type BackToHeroProps = {
  watchId: string
  targetId: string
}

function BackToHero({ watchId, targetId }: BackToHeroProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const watched = document.getElementById(watchId)
    if (!watched) return

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "0px 0px -25% 0px" }
    )
    observer.observe(watched)

    return () => observer.disconnect()
  }, [watchId])

  function scrollToTarget() {
    const target = document.getElementById(targetId)
    if (!target) return

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    target.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    })
  }

  return (
    <button
      type="button"
      onClick={scrollToTarget}
      aria-label="Back to top"
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      className={`group fixed top-1/2 right-4 z-40 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 text-primary shadow-lg backdrop-blur-md transition-all duration-300 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-secondary/50 sm:right-6 ${
        visible
          ? "translate-x-0 opacity-100"
          : "pointer-events-none translate-x-4 opacity-0"
      }`}
    >
      <ArrowUp className="size-5 transition-transform duration-200 group-hover:-translate-y-0.5" />
    </button>
  )
}

export { BackToHero }
