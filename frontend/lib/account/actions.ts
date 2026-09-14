"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

/** Same contract as the other action modules: `formError` renders in the form. */
export type AccountResult = {
  formError?: string
}

const maxNameLength = 60

export async function updateDisplayName(name: string): Promise<AccountResult> {
  const trimmed = name.trim()

  if (!trimmed) return { formError: "Your name can't be empty." }
  if (trimmed.length > maxNameLength) {
    return { formError: `Keep it under ${maxNameLength} characters.` }
  }

  const supabase = await createClient()

  // user_metadata is the right home for this: it is a label, and the fact that
  // its owner can edit it is the point. Nothing authorises off it.
  const { error } = await supabase.auth.updateUser({
    data: { full_name: trimmed },
  })

  if (error) return { formError: describe(error.message) }

  // The name appears in the header, the greeting and every seat.
  revalidatePath("/", "layout")
  return {}
}

export async function changePassword(password: string): Promise<AccountResult> {
  if (password.length < 8) {
    return { formError: "Use at least 8 characters." }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { formError: describe(error.message) }

  return {}
}

/**
 * Closes the door but keeps the data.
 *
 * Runs through `deactivate_own_account`, which sets the `banned_until` that
 * GoTrue checks at sign-in — so this is enforced by the auth service, not by
 * the app remembering to check a flag. Signing out afterwards matters: the
 * access token already issued stays valid until it expires.
 */
export async function deactivateAccount(): Promise<AccountResult> {
  const supabase = await createClient()

  const { error } = await supabase.rpc("deactivate_own_account")
  if (error) return { formError: describe(error.message) }

  await supabase.auth.signOut()
  revalidatePath("/", "layout")
  redirect("/?deactivated=1")
}

/**
 * Deletes the account and everything it owns.
 *
 * `delete_own_account` takes no arguments — there is nothing to point at
 * anyone else — and the cascade from `auth.users` removes the profile, every
 * seat, every vote and every game owned.
 */
export async function deleteAccount(): Promise<AccountResult> {
  const supabase = await createClient()

  const { error } = await supabase.rpc("delete_own_account")
  if (error) return { formError: describe(error.message) }

  await supabase.auth.signOut()
  revalidatePath("/", "layout")
  redirect("/")
}

/** Supabase auth messages are terse; give the reachable ones real copy. */
function describe(message: string) {
  if (/same.*password|should be different/i.test(message)) {
    return "That's already your password."
  }
  if (/weak|at least/i.test(message)) {
    return "Pick a longer password — at least 8 characters."
  }
  if (/reauthentication|session/i.test(message)) {
    return "Sign in again before changing this."
  }
  if (/rate limit|too many/i.test(message)) {
    return "Too many attempts. Try again shortly."
  }

  return message
}
