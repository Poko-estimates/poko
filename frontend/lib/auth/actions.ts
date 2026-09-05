"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"

/**
 * What a form gets back when the action does not redirect. `formError` is shown
 * above the fields; `status` lets a form switch to a confirmation state.
 */
export type AuthResult = {
  formError?: string
  status?: "check-email"
}

type Credentials = { email: string; password: string }
type Registration = Credentials & { name: string }

export async function signIn({ email, password }: Credentials): Promise<AuthResult> {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { formError: describe(error.message) }

  // Server components read the session from cookies, so they need re-rendering.
  revalidatePath("/", "layout")
  redirect("/dashboard?welcome=signin")
}

export async function signUp({
  email,
  password,
  name,
}: Registration): Promise<AuthResult> {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Display name only. User metadata is editable by the user it belongs
      // to, so it must never be trusted for authorization decisions.
      data: { full_name: name.trim() },
      emailRedirectTo: `${await siteOrigin()}/auth/confirm?next=/dashboard%3Fwelcome%3Dsignup`,
    },
  })
  if (error) return { formError: describe(error.message) }

  // With email confirmations on, Supabase returns a user but no session until
  // the link is clicked. With them off, the user is signed in right away.
  if (!data.session) return { status: "check-email" }

  revalidatePath("/", "layout")
  redirect("/dashboard?welcome=signup")
}

export async function requestPasswordReset(email: string): Promise<AuthResult> {
  const supabase = await createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteOrigin()}/auth/confirm?next=/reset-password`,
  })
  // Never confirm or deny that an address has an account.
  if (error && !isUnknownEmail(error.message)) {
    return { formError: describe(error.message) }
  }

  return { status: "check-email" }
}

export async function updatePassword(password: string): Promise<AuthResult> {
  const supabase = await createClient()

  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { formError: describe(error.message) }

  revalidatePath("/", "layout")
  redirect("/dashboard?welcome=reset")
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()

  revalidatePath("/", "layout")
  redirect("/")
}

/** Absolute origin for the links Supabase emails out. */
async function siteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL
  if (configured) return configured.replace(/\/$/, "")

  const headerList = await headers()
  const origin = headerList.get("origin")
  if (origin) return origin

  const host = headerList.get("host") ?? "localhost:3000"
  const protocol = host.startsWith("localhost") ? "http" : "https"
  return `${protocol}://${host}`
}

function isUnknownEmail(message: string) {
  return /user not found/i.test(message)
}

/** Supabase messages are terse and lowercase; give the common ones real copy. */
function describe(message: string) {
  if (/invalid login credentials/i.test(message)) {
    return "That email and password don't match an account."
  }
  if (/email not confirmed/i.test(message)) {
    return "Confirm your email address first — check your inbox for the link."
  }
  if (/already registered/i.test(message)) {
    return "An account with that email already exists. Try signing in instead."
  }
  if (/email address .* is invalid|email_address_invalid/i.test(message)) {
    return "Supabase rejected that address. Use a real inbox you can receive mail at — example and test domains aren't accepted."
  }
  // The built-in email service sends 2 messages an hour for the whole project,
  // so this trips during development long before any user would see it.
  if (/email rate limit|over_email_send_rate_limit/i.test(message)) {
    return "We couldn't send the confirmation email — this project has hit its hourly email limit. Try again later."
  }
  if (/rate limit|too many requests/i.test(message)) {
    return "Too many attempts. Try again shortly."
  }
  return message
}
