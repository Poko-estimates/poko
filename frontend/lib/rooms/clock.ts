/**
 * One ticker shared by every countdown on the page.
 *
 * Plain module state rather than React state, read through
 * `useSyncExternalStore`. That combination is what keeps the countdown legal
 * under this repo's lint rules: there is no `setState` in an effect anywhere,
 * and the server snapshot is `null` so the first client paint matches the HTML
 * the server sent.
 *
 * The snapshot is a cached value, not `Date.now()`. `getSnapshot` must return
 * the identical value until the store genuinely changes — returning a fresh
 * timestamp on every call would re-render forever.
 */

let seconds = Math.floor(Date.now() / 1000)
let timer: ReturnType<typeof setInterval> | null = null

const listeners = new Set<() => void>()

function recompute() {
  const next = Math.floor(Date.now() / 1000)
  if (next === seconds) return

  seconds = next
  listeners.forEach((listener) => listener())
}

/** Subscribes to whole-second changes. The interval only runs while watched. */
function subscribeToSeconds(listener: () => void) {
  listeners.add(listener)
  // Polled faster than once a second so the display never lags a tick behind.
  timer ??= setInterval(recompute, 250)

  return () => {
    listeners.delete(listener)

    if (listeners.size === 0 && timer) {
      clearInterval(timer)
      timer = null
    }
  }
}

const getSecondsSnapshot = () => seconds

/** There is no clock on the server — render a placeholder and let the browser fill it in. */
const getServerSecondsSnapshot = (): number | null => null

/**
 * How long a round may be asked to run for, mirroring the
 * `issues_duration_range` CHECK and the bounds `start_round` enforces.
 *
 * Below ten seconds nobody can read the story; an hour is longer than a single
 * estimate is worth arguing about.
 */
const minRoundSeconds = 10
const maxRoundSeconds = 3600

/** What the room prefills when an issue has never had a round timed. */
const defaultRoundSeconds = 120

/** 90 -> "1:30", 5 -> "0:05". Shared so a countdown and a duration agree. */
function formatSeconds(seconds: number) {
  const minutes = Math.floor(seconds / 60)

  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`
}

export {
  defaultRoundSeconds,
  formatSeconds,
  maxRoundSeconds,
  minRoundSeconds,
  getSecondsSnapshot,
  getServerSecondsSnapshot,
  subscribeToSeconds,
}
