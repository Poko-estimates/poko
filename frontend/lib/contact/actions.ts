"use server"

import {
  maxEmailLength,
  maxMessageLength,
  maxNameLength,
} from "@/lib/contact/limits"
import { createClient } from "@/lib/supabase/server"

/** Same contract as the other forms: `formError` renders above the fields. */
export type ContactResult = {
  formError?: string
}

export type ContactDraft = {
  /** Optional — blank is normalised to null rather than stored as "". */
  name: string | null
  email: string
  message: string
  /** The privacy box. Stored, not just checked, so consent is on the record. */
  agreedToPrivacy: boolean
}

/**
 * Takes a message from the contact form.
 *
 * No `.select()` on the insert, and that is not an oversight. The table has no
 * SELECT policy — it is a public form target, so nobody with a session may
 * read strangers' messages — and `insert ... returning` is gated by exactly
 * that policy. Asking for the row back would turn every successful submission
 * into a 403.
 *
 * Nothing is revalidated either: no page reads this table.
 */
export async function sendMessage(draft: ContactDraft): Promise<ContactResult> {
  const fields = validate(draft)
  if (!fields.ok) return { formError: fields.formError }

  const supabase = await createClient()

  // user_id is absent on purpose: it defaults to auth.uid() and appears in no
  // grant, so a message is attributed to the sender's session or to nobody.
  const { error } = await supabase.from("contact_messages").insert({
    name: fields.name,
    email: fields.email,
    message: fields.message,
    privacy_accepted: true,
  })

  if (error) return { formError: describe(error) }

  return {}
}

type ValidDraft = {
  ok: true
  name: string | null
  email: string
  message: string
}

/**
 * A server action is a public endpoint, so this runs whatever the form already
 * checked — that validation is a courtesy to the person typing, not a control.
 */
function validate(
  draft: ContactDraft
): ValidDraft | { ok: false; formError: string } {
  // Checked here as well as in the database. The CHECK is what guarantees no
  // message is ever stored without consent; this is what turns that into a
  // sentence rather than a constraint violation.
  if (draft.agreedToPrivacy !== true) {
    return {
      ok: false,
      formError: "Please confirm you agree to the privacy policy.",
    }
  }

  const name = draft.name?.trim() || null
  if (name && name.length > maxNameLength) {
    return { ok: false, formError: `Keep your name under ${maxNameLength} characters.` }
  }

  const email = draft.email.trim()
  if (!email) {
    return { ok: false, formError: "Add an email address so we can reply." }
  }
  if (email.length > maxEmailLength || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, formError: "That doesn't look like an email address." }
  }

  const message = draft.message.trim()
  if (!message) {
    return { ok: false, formError: "Tell us what's on your mind." }
  }
  if (message.length > maxMessageLength) {
    return {
      ok: false,
      formError: `Keep the message under ${maxMessageLength} characters.`,
    }
  }

  return { ok: true, name, email, message }
}

/**
 * Postgres and PostgREST errors are terse and leak schema detail. Same shape
 * as `describe()` in `lib/issues/actions.ts`.
 */
function describe(error: { code?: string; message: string }) {
  // 23514 is one of the CHECKs above — the form and the schema have drifted,
  // which is a bug rather than something the sender can fix by rewording.
  if (error.code === "23514") {
    return "We couldn't accept that message. Check the email address and try again."
  }
  // 42501 here would mean the insert grant is gone, which breaks the form for
  // everyone rather than for this one person.
  if (error.code === "42501") {
    return "The contact form isn't accepting messages right now."
  }

  return error.message
}
