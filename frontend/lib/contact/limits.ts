/**
 * Field limits for the contact form, mirroring the CHECK constraints on
 * `contact_messages`.
 *
 * Their own module because `actions.ts` carries "use server", where only async
 * functions may be exported — the form needs these values at render time to
 * cap the inputs and count down the characters left.
 */

/** Mirrors `contact_messages_name_length`. */
const maxNameLength = 80

/** Mirrors `contact_messages_email_length`. */
const maxEmailLength = 254

/** Mirrors `contact_messages_message_length`. */
const maxMessageLength = 4000

export { maxEmailLength, maxMessageLength, maxNameLength }
