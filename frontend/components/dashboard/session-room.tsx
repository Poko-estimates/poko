"use client"

import { useState } from "react"
import { Timer, Users } from "lucide-react"

import { cn } from "@/lib/utils"

type Player = {
  initials: string
  name: string
  vote: string | null
}

/** The rest of the table. The signed-in user is added as the last seat. */
const teammates: Player[] = [
  { initials: "AK", name: "Ama Kyei", vote: "5" },
  { initials: "DM", name: "Daniel Mensah", vote: "5" },
  { initials: "SO", name: "Sena Osei", vote: "8" },
  { initials: "RT", name: "Rita Tetteh", vote: "3" },
  { initials: "JB", name: "Joel Baidoo", vote: "5" },
]

const deck = ["1", "2", "3", "5", "8", "13", "?"]

/**
 * A full-page build of the estimation room from the hero mockup. The deck is
 * live — picking a card seats your vote at the table and recounts the room —
 * but the teammates are stand-ins until sessions are real.
 */
function SessionRoom({ displayName, initials }: { displayName: string; initials: string }) {
  const [myVote, setMyVote] = useState<string | null>(null)

  const players: Player[] = [
    ...teammates,
    { initials, name: displayName, vote: myVote },
  ]
  const { consensus, outliers, voted } = tally(players)

  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-[0_45px_90px_-45px_rgba(20,33,61,0.5)]">
      {/* Window chrome, matching the marketing mockup */}
      <div className="flex items-center gap-3 bg-primary px-5 py-3.5">
        <div className="flex shrink-0 gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-white/25" />
          <span className="size-2.5 rounded-full bg-white/25" />
          <span className="size-2.5 rounded-full bg-white/25" />
        </div>
        <p className="min-w-0 truncate font-mono text-xs text-white/60">
          poko.app/room/atlas-sprint-24
        </p>
        <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full bg-secondary/15 px-2.5 py-1 text-[0.6875rem] font-semibold tracking-wide text-secondary uppercase">
          <span className="size-1.5 rounded-full bg-secondary" />
          Live
        </span>
      </div>

      <div className="space-y-6 p-5 sm:p-8">
        {/* Ticket under discussion */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-secondary/15 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
                PK-2481
              </span>
              <span className="text-xs text-muted-foreground">
                Sprint 24 · Refinement
              </span>
            </div>
            <h2 className="mt-2 text-lg font-semibold text-primary sm:text-xl">
              Add SSO for enterprise workspaces
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 font-mono text-xs font-medium text-primary">
              <Timer className="size-3.5 text-secondary" aria-hidden="true" />
              01:12
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-primary">
              <Users className="size-3.5 text-secondary" aria-hidden="true" />
              {voted}/{players.length}
            </span>
          </div>
        </div>

        {/* The table */}
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {players.map((player, index) => {
            const isYou = index === players.length - 1

            return (
              <li
                key={player.initials}
                className={cn(
                  "flex min-w-0 flex-col items-center gap-2.5 rounded-2xl p-3 sm:p-4",
                  isYou ? "bg-secondary/12 ring-1 ring-secondary/35" : "bg-surface"
                )}
              >
                <div
                  className={cn(
                    "flex h-20 w-15 items-center justify-center rounded-xl text-2xl font-semibold tabular-nums",
                    player.vote
                      ? "bg-primary text-white"
                      : "border-2 border-dashed border-border bg-card text-muted-foreground"
                  )}
                >
                  {player.vote ?? (
                    <span className="flex gap-0.5" aria-hidden="true">
                      <span className="size-1.5 rounded-full bg-current" />
                      <span className="size-1.5 rounded-full bg-current" />
                      <span className="size-1.5 rounded-full bg-current" />
                    </span>
                  )}
                </div>

                <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[0.625rem] font-bold text-primary">
                    {player.initials}
                  </span>
                  <span className="truncate">
                    {isYou ? "You" : player.name.split(" ")[0]}
                  </span>
                </span>

                <span className="sr-only">
                  {player.vote
                    ? `${player.name} voted ${player.vote}`
                    : `${player.name} is still voting`}
                </span>
              </li>
            )
          })}
        </ul>

        {/* Your deck */}
        <div>
          <p className="mb-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Your hand
          </p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {deck.map((value) => {
              const selected = value === myVote

              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setMyVote(selected ? null : value)}
                  className={cn(
                    "flex h-16 items-center justify-center rounded-xl border text-base font-semibold tabular-nums transition-all outline-none focus-visible:ring-3 focus-visible:ring-secondary/50",
                    selected
                      ? "-translate-y-1 border-secondary bg-secondary text-primary"
                      : "border-border bg-card text-primary hover:-translate-y-0.5 hover:border-secondary/50"
                  )}
                >
                  {value}
                </button>
              )
            })}
          </div>
        </div>

        {/* Outcome */}
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface px-4 py-4">
          <div>
            <p className="text-xs text-muted-foreground">Team consensus</p>
            <p className="text-sm font-semibold text-primary">
              {consensus === null
                ? "Waiting on the first card"
                : `${consensus} points · ${outliers} ${outliers === 1 ? "outlier" : "outliers"} to discuss`}
            </p>
          </div>
          <span className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white">
            Save estimate
          </span>
        </div>
      </div>
    </section>
  )
}

/** Most-voted value across the table, and how many cards disagree with it. */
function tally(players: Player[]) {
  const votes = players.map((player) => player.vote).filter((vote) => vote !== null)
  if (votes.length === 0) return { consensus: null, outliers: 0, voted: 0 }

  const counts = new Map<string, number>()
  votes.forEach((vote) => counts.set(vote, (counts.get(vote) ?? 0) + 1))

  const [consensus, agreed] = [...counts.entries()].reduce((best, entry) =>
    entry[1] > best[1] ? entry : best
  )

  return { consensus, outliers: votes.length - agreed, voted: votes.length }
}

export { SessionRoom }
