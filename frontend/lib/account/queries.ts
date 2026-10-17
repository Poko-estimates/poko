import { initialsFor, toTier, type Account } from "@/lib/account/model"
import { createClient } from "@/lib/supabase/server"

/**
 * The signed-in account, or null when there isn't one.
 *
 * The tier comes from `profiles` rather than the JWT because a claim is only
 * as fresh as the last token refresh, and a plan change should show up
 * immediately.
 */
async function getAccount(): Promise<Account | null> {
  const supabase = await createClient()

  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  const id = typeof claims?.sub === "string" ? claims.sub : null
  if (!claims || !id) return null

  const email = typeof claims.email === "string" ? claims.email : null
  const displayName = readDisplayName(claims) || email?.split("@")[0] || "Guest"

  // RLS narrows this to the caller's own row, so no filter is needed — and a
  // missing row (which the trigger should make impossible) degrades to free
  // rather than throwing the settings page away.
  const { data: profile } = await supabase
    .from("profiles")
    .select("tier, created_at")
    .maybeSingle()

  return {
    id,
    email,
    displayName,
    initials: initialsFor(displayName),
    tier: toTier(profile?.tier ?? "free"),
    isGuest: claims.is_anonymous === true,
    joinedAt: profile?.created_at ?? null,
  }
}

/** The name captured at sign-up. Display only. */
function readDisplayName(claims: Record<string, unknown>) {
  const metadata = claims.user_metadata
  if (typeof metadata !== "object" || metadata === null) return ""

  const fullName = (metadata as Record<string, unknown>).full_name
  return typeof fullName === "string" ? fullName.trim() : ""
}

export { getAccount }
