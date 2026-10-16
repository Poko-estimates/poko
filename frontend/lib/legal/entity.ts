/**
 * Facts the legal pages must state, in one place so they cannot disagree.
 * No address yet: GDPR Art. 13 still needs contact details, so these inboxes
 * carry that alone and have to be monitored.
 */
export const entity = {
  name: "Poko",
  /** The inbox that answers privacy and data-subject requests. */
  privacyEmail: "privacy.poko@gmail.com",
  /** The inbox for contractual and legal notices. */
  legalEmail: "legal.poko@gmail.com",
  /**
   * The contact page is a mailto and nothing else, so a bounced or unread
   * address loses every message silently. Give it its own inbox eventually.
   */
  contactEmail: "legal.poko@gmail.com",
} as const

/**
 * Kept apart from the regulators below: governing law is ours to choose, but
 * which authority hears a privacy complaint depends on where the reader lives.
 */
export const governing = {
  /** TODO: confirm with counsel before publishing. */
  law: "the laws of the Republic of Ghana",
  courts: "the courts of Accra, Ghana",
} as const

/**
 * Both are named because Poko answers to both — Act 843 binds the operator,
 * the GDPR binds anyone serving EU/UK users wherever they run.
 */
export const authorities = {
  ghana: "the Data Protection Commission of Ghana",
  /** TODO: the EU lead supervisory authority, or the reader's local one. */
  eu: "your local data protection authority in the EU or the UK",
} as const

/**
 * Processors, listed so the claim can be checked against reality. A new
 * service that touches user data means a row here and a fresh policy date.
 */
export const subprocessors = [
  {
    name: "Supabase",
    role: "Database, authentication and realtime messaging",
    data: "Account credentials, profile details, issues, sprints, votes and contact messages.",
  },
  {
    // TODO: name the hosting provider and its processing region.
    name: "TODO — hosting provider",
    role: "Application hosting and content delivery",
    data: "Request metadata, including IP address and browser user agent, in server logs.",
  },
  {
    // TODO: name the sender, or drop that half if Supabase's own still does
    // it. Receiving is Google regardless, while the address is a Gmail one.
    name: "TODO — email provider, and Google (Gmail)",
    role: "Sending account email, and receiving anything you write to us",
    data: "Your email address, the contents of account emails we send you, and any message you send us.",
  },
] as const

/**
 * Written out, not computed: `new Date()` would restamp all three on every
 * build, claiming a review that never happened. Edit the one you changed.
 */
export const lastUpdated = {
  privacy: "28 September 2026",
  terms: "28 September 2026",
  cookies: "28 September 2026",
} as const
