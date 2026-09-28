/**
 * The facts the legal pages have to state and the codebase cannot derive.
 *
 * All three documents read from here rather than naming the operator in prose,
 * because these values appear a dozen times across the pages and a policy that
 * names two different entities is worse than one that names none.
 *
 * There is no postal address or company number here because Poko is not a
 * registered company yet. Both controller identity and contact details are
 * still required under GDPR Art. 13, so the email addresses below are carrying
 * that obligation on their own — which means they have to be monitored, and
 * they have to be replaced by a real entity block once one exists.
 */
export const entity = {
  name: "Poko",
  /** The inbox that answers privacy and data-subject requests. */
  privacyEmail: "privacy.poko@gmail.com",
  /** The inbox for contractual and legal notices. */
  legalEmail: "legal.poko@gmail.com",
} as const

/**
 * The law the contract runs under, and the courts that hear a dispute about it.
 *
 * Separate from the two data-protection regulators below on purpose: which law
 * governs the agreement is a choice we make, while which authority hears a
 * privacy complaint is decided by where the reader lives and is not ours to
 * pick. Conflating them is how a policy ends up telling an EU reader their only
 * recourse is a court in another hemisphere, which is not true and not
 * enforceable against a consumer.
 */
export const governing = {
  /** TODO: confirm with counsel before publishing. */
  law: "the laws of the Republic of Ghana",
  courts: "the courts of Accra, Ghana",
} as const

/**
 * Where a complaint goes when we have not resolved it ourselves.
 *
 * Two regulators are named because Poko is answerable to both: the Ghanaian
 * Act binds the operator, and the GDPR binds anyone offering a service to
 * people in the EU/UK regardless of where they run it. A reader in either place
 * needs to see their own authority, not ours.
 */
export const authorities = {
  ghana: "the Data Protection Commission of Ghana",
  /** TODO: the EU lead supervisory authority, or the reader's local one. */
  eu: "your local data protection authority in the EU or the UK",
} as const

/**
 * Third parties that process personal data on our behalf.
 *
 * Listed by role rather than buried in prose so the list can be checked against
 * reality. Adding a service that touches user data means adding a row here and
 * dating the privacy policy again — that is the point of keeping it in one
 * place. Supabase is named with confidence; it is the database, auth service
 * and realtime transport this app is built on.
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
    // TODO: name the transactional email provider used for confirmation and
    // password-reset messages, or delete this row if Supabase's built-in
    // sender is still doing it.
    name: "TODO — email provider",
    role: "Transactional email",
    data: "Your email address and the contents of account emails we send you.",
  },
] as const

/**
 * When each document last changed, written out rather than computed.
 *
 * A generated `new Date()` would restamp all three every time the site is
 * rebuilt, which quietly claims a review that never happened — and the date on
 * a policy is the thing a reader uses to decide whether it still describes the
 * service. Edit the one document's date when you edit that document.
 */
export const lastUpdated = {
  privacy: "28 September 2026",
  terms: "28 September 2026",
  cookies: "28 September 2026",
} as const
