"use client"

import { useEffect, useEffectEvent } from "react"
import { createPortal } from "react-dom"
import { Hourglass, PartyPopper } from "lucide-react"

/**
 * The message that marks a round settling — with a confetti shower when the
 * table agreed, and without one otherwise.
 *
 * Confetti is reserved for consensus on purpose. Running out of time isn't an
 * achievement, and showering every round ending would turn the celebration
 * into wallpaper: if it fires for everything it signals nothing.
 *
 * The pieces are laid out by index arithmetic rather than `Math.random()`. Two
 * reasons: this repo treats impure render as a lint error, and a random layout
 * would differ between the server and client renders. Multiplying by numbers
 * coprime with the modulus scatters them convincingly enough.
 */
const COLORS = [
  "var(--secondary)",
  "var(--success)",
  "var(--primary)",
  "var(--secondary)",
  "var(--success)",
]

const PIECES = Array.from({ length: 46 }, (_, i) => ({
  left: (i * 97) % 100,
  drift: ((i * 53) % 140) - 70,
  spin: 360 + ((i * 71) % 600),
  delay: ((i * 29) % 80) / 100,
  duration: 2.4 + ((i * 41) % 140) / 100,
  size: 6 + ((i * 17) % 5),
  color: COLORS[i % COLORS.length],
}))

/** How long the whole thing stays on screen, including the slowest piece. */
const LIFETIME_MS = 4200

function RoundOverNotice({
  message,
  onDone,
  variant = "consensus",
}: {
  message: string
  onDone: () => void
  variant?: "consensus" | "timeout"
}) {
  const celebrate = variant === "consensus"
  const Icon = celebrate ? PartyPopper : Hourglass

  // Keeps the timer from restarting if the parent passes a fresh closure.
  const done = useEffectEvent(onDone)

  useEffect(() => {
    const timer = setTimeout(() => done(), LIFETIME_MS)

    return () => clearTimeout(timer)
  }, [])

  // Portalled to the body so `fixed` really means the viewport. Rendered from
  // inside the room card otherwise, any ancestor with a transform would become
  // its containing block and trap the shower inside that card.
  return createPortal(
    <>
      {celebrate && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
        >
          {PIECES.map((piece, index) => (
            <span
              key={index}
              className="absolute top-0 block rounded-[1px]"
              style={
                {
                  left: `${piece.left}%`,
                  width: piece.size,
                  height: Math.round(piece.size * 1.8),
                  background: piece.color,
                  animation: `confetti-fall ${piece.duration}s linear ${piece.delay}s forwards`,
                  "--drift": `${piece.drift}px`,
                  "--spin": `${piece.spin}deg`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      )}

      <div className="pointer-events-none fixed inset-x-0 top-[18vh] z-50 flex justify-center px-4">
        {/* role=status so the announcement doesn't depend on seeing confetti. */}
        <p
          role="status"
          className="animate-rise inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-[0_25px_50px_-20px_rgba(20,33,61,0.65)]"
        >
          <Icon className="size-4 text-secondary" aria-hidden="true" />
          {message}
        </p>
      </div>
    </>,
    document.body
  )
}

export { RoundOverNotice }
