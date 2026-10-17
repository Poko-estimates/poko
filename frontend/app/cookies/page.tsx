import type { Metadata } from "next"

import { LegalPage, type LegalSection } from "@/components/legal/legal-page"
import {
  Bullets,
  Callout,
  MailTo,
  P,
  Table,
  Term,
  TextLink,
} from "@/components/legal/prose"
import { entity, lastUpdated } from "@/lib/legal/entity"

export const metadata: Metadata = {
  title: "Cookie notice",
  description:
    "Poko sets the cookies it needs to keep you signed in, and nothing else. No analytics, no advertising, no third-party trackers — which is why there is no cookie banner.",
}

/**
 * Every cookie the site sets. The names are patterns: `<project>` is our
 * Supabase project ref, and the session cookie splits into numbered parts when
 * its token outgrows one cookie.
 */
const cookies = [
  {
    name: "sb-<project>-auth-token",
    purpose: "Keeps you signed in. Without it every page load forgets you.",
    duration: "Until you sign out, at most 400 days",
  },
  {
    name: "sb-<project>-auth-token.0, .1, …",
    purpose: "The same session, split up when the token is too big for one.",
    duration: "Until you sign out, at most 400 days",
  },
  {
    name: "sb-<project>-auth-token…-code-verifier",
    purpose:
      "Proves a sign-in, confirmation or password reset finished in the browser that started it.",
    duration: "Minutes",
  },
] as const

const sections: readonly LegalSection[] = [
  {
    id: "the-short-version",
    heading: "The short version",
    body: (
      <>
        <Callout>
          Poko sets three cookies, all of them to keep you signed in. No
          analytics, no advertising, no third-party trackers — so there is
          nothing here to ask your permission for, and no banner asking for it.
        </Callout>
        <P>
          If that answers your question, you can stop reading. The rest names
          each one and tells you how to block them.
        </P>
      </>
    ),
  },
  {
    id: "what-we-set",
    heading: "What Poko sets",
    body: (
      <>
        <Table>
          <thead>
            <tr>
              <th scope="col">Cookie</th>
              <th scope="col">What it is for</th>
              <th scope="col">How long</th>
            </tr>
          </thead>
          <tbody>
            {cookies.map((cookie) => (
              <tr key={cookie.name}>
                <td className="font-mono text-xs break-all text-primary!">
                  {cookie.name}
                </td>
                <td>{cookie.purpose}</td>
                <td>{cookie.duration}</td>
              </tr>
            ))}
          </tbody>
        </Table>
        <P>
          All three are set by Poko itself, scoped to this site, and marked{" "}
          <Term>SameSite=Lax</Term>, so your browser will not attach them to
          requests another site makes. Guests get the same cookies as account
          holders. Your session lives only in these cookies, never in local
          storage.
        </P>
      </>
    ),
  },
  {
    id: "what-we-dont",
    heading: "What Poko does not set",
    body: (
      <Bullets>
        <li>
          <Term>No analytics.</Term> No Google Analytics, no product analytics,
          no heatmaps. We do not know which pages you visited.
        </li>
        <li>
          <Term>No advertising.</Term> We do not retarget you elsewhere, and we
          sell nothing to anyone who would.
        </li>
        <li>
          <Term>No social pixels, and no cross-site tracking.</Term> Nothing we
          set follows you to another site, because nothing we set is readable by
          one.
        </li>
      </Bullets>
    ),
  },
  {
    id: "no-banner",
    heading: "Why there is no banner",
    body: (
      <>
        <P>
          Consent is only needed for cookies that are not{" "}
          <Term>strictly necessary</Term> to provide what you asked for. Every
          cookie above exists to keep you signed in to a service you chose to
          sign in to, and none of them measures you. So there is nothing to
          consent to, and a banner would be theatre.
        </P>
        <Callout>
          If we ever add something that is not strictly necessary — analytics,
          say — we will ask first, it will be off until you say yes, and this
          page will change before that cookie reaches your browser.
        </Callout>
      </>
    ),
  },
  {
    id: "managing",
    heading: "Blocking them anyway",
    body: (
      <P>
        Every major browser lets you refuse or delete cookies, for one site or
        all of them. Know what happens first:{" "}
        <Term>you will not be able to sign in</Term>. Blocking Poko&apos;s
        cookies does not degrade the service, it stops it — the marketing pages
        still work and nothing behind a sign-in does. Signing out clears them
        yourself, which is the tidier way to leave a shared computer.
      </P>
    ),
  },
  {
    id: "changes",
    heading: "Changes and questions",
    body: (
      <P>
        We update this page when the cookies change. If what you see in your
        browser does not match it, that is worth telling us — write to{" "}
        <MailTo address={entity.email} />. What we do with the data
        behind these cookies is covered by the{" "}
        <TextLink href="/privacy">privacy policy</TextLink>.
      </P>
    ),
  },
]

export default function Page() {
  return (
    <LegalPage
      eyebrow="Cookies"
      title="Three cookies, all of them for signing you in"
      summary={
        <>
          Poko stores what it needs to remember who you are and nothing else. No
          analytics, no advertising, no trackers — and so no banner.
        </>
      }
      lastUpdated={lastUpdated.cookies}
      sections={sections}
      related={[
        { label: "Privacy policy", href: "/privacy" },
        { label: "Terms and conditions", href: "/terms" },
      ]}
    />
  )
}
