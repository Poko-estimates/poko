import type { Enums } from "@/lib/supabase/database.types"

/** Mirrors the `profiles_tier_valid` CHECK. */
type Tier = "free" | "pro"

const tierLabels: Record<Tier, string> = {
  free: "Free",
  pro: "Pro",
}

type Account = {
  id: string
  email: string | null
  /** From user_metadata, so display only — never an authorization signal. */
  displayName: string
  initials: string
  tier: Tier
  /** Anonymous guests have an account but no way to sign back into it. */
  isGuest: boolean
  joinedAt: string | null
}

function toTier(value: string): Tier {
  return value === "pro" ? "pro" : "free"
}

/** Two letters for the avatar: "Jane Doe" -> "JD", "jane.doe" -> "JD". */
function initialsFor(name: string) {
  const parts = name.split(/[\s.\-_+]/).filter(Boolean)
  const letters =
    parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2)

  return letters.toUpperCase() || "?"
}

export { initialsFor, tierLabels, toTier }
export type { Account, Enums, Tier }
