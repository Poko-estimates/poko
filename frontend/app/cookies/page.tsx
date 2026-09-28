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
 * Every cookie the site sets, described by what it does rather than by its
 * literal name alone.
 *
 * The names are patterns, not strings, and deliberately so: `<project>` is our
 * Supabase project reference, and the session cookie splits into numbered
 * parts when its token outgrows one cookie. A reader inspecting their browser
 * sees something like `sb-abcdefgh-auth-token.0`. Stating the pattern is what
 * makes this table checkable against a real browser instead of merely
 * plausible — 400 days is the cap browsers enforce on cookie lifetime, which
 * is where that figure comes from.
 */
const cookies = [
  {
    name: "sb-<project>-auth-token",
    purpose:
      "Holds your signed-in session — the account or guest seat you are using. Without it, every page load would forget who you are.",
    duration: "Until you sign out, and at most 400 days",
    kind: "Strictly necessary",
  },
  {
    name: "sb-<project>-auth-token.0, .1, …",
    purpose:
      "The same session, split across numbered parts when the token is larger than a single cookie can hold. Same purpose, same lifetime.",
    duration: "Until you sign out, and at most 400 days",
    kind: "Strictly necessary",
  },
  {
    name: "sb-<project>-auth-token…-code-verifier",
    purpose:
      "A short-lived value proving that a sign-in, email confirmation or password reset was finished by the same browser that started it. Several may exist briefly if you have more than one flow open.",
    duration: "Minutes — cleared once the flow completes",
    kind: "Strictly necessary",
  },
] as const

const sections: readonly LegalSection[] = [
  {
    id: "the-short-version",
    heading: "The short version",
    body: (
      <>
        <Callout>
          Poko sets three cookies, all of them for keeping you signed in. There
          is no analytics service, no advertising network and no third-party
          tracker on this site — so there is nothing here to ask your permission
          for, and no banner asking for it.
        </Callout>
        <P>
          If that is all you wanted to know, you can stop reading. The rest of
          this page names each cookie, explains why we say no consent is needed,
          and tells you how to block them anyway.
        </P>
      </>
    ),
  },
  {
    id: "what-cookies-are",
    heading: "What a cookie is doing here",
    body: (
      <>
        <P>
          A cookie is a small piece of text your browser stores for a site and
          sends back on each request. The site can then recognise the same
          browser from one page to the next.
        </P>
        <P>
          That is the whole reason Poko sets any: the web has no memory of its
          own, so without a cookie carrying your session, signing in would last
          exactly one page load. Every request you make refreshes that session
          so it does not expire mid-round.
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
              <th scope="col">How long it lasts</th>
              <th scope="col">Type</th>
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
                <td>{cookie.kind}</td>
              </tr>
            ))}
          </tbody>
        </Table>
        <P>
          <Term>&lt;project&gt;</Term> identifies our database project, so the
          real names in your browser carry a short string of letters in that
          position. All three are first-party cookies set by Poko itself, scoped
          to this site, and marked <Term>SameSite=Lax</Term> — meaning your
          browser will not attach them to requests another site makes on your
          behalf.
        </P>
        <P>
          Guests get the same cookies as account holders. Taking a seat from an
          invite link creates an anonymous session, and that session lives in
          the same cookie a signed-in account would use.
        </P>
      </>
    ),
  },
  {
    id: "what-we-dont",
    heading: "What Poko does not set",
    body: (
      <>
        <P>
          We think this list is the more useful one, so here it is explicitly.
          Poko uses:
        </P>
        <Bullets>
          <li>
            <Term>No analytics or measurement cookies.</Term> There is no
            Google Analytics, no product analytics SDK and no heatmap tool on
            this site. We do not know which pages you visited.
          </li>
          <li>
            <Term>No advertising or retargeting cookies.</Term> We do not
            advertise to you elsewhere based on having been here, and we sell
            nothing to anyone who would.
          </li>
          <li>
            <Term>No social media pixels.</Term> No embedded widget is phoning
            home from these pages.
          </li>
          <li>
            <Term>No cross-site tracking of any kind.</Term> Nothing we set
            follows you to another site, because nothing we set is readable by
            one.
          </li>
        </Bullets>
        <P>
          Poko also does not keep your session in your browser&apos;s local
          storage. Cookies are the only place it lives, which is what lets the
          server recognise you before it renders a page rather than after.
        </P>
      </>
    ),
  },
  {
    id: "no-banner",
    heading: "Why there is no cookie banner",
    body: (
      <>
        <P>
          Under the EU ePrivacy rules — and the equivalent expectations under
          Ghana&apos;s Data Protection Act, 2012 (Act 843) — consent is required
          before storing anything on your device that is not{" "}
          <Term>strictly necessary</Term> to provide the service you asked for.
          Consent is not required for the cookies that are.
        </P>
        <P>
          Every cookie in the table above exists to keep you signed in to a
          service you chose to sign in to. None of them measures you or tells
          anyone about you. So there is nothing to consent to, and a banner
          asking you to consent anyway would be theatre.
        </P>
        <Callout>
          If we ever add something that is not strictly necessary — analytics,
          for example — we will ask first, it will be off until you say yes, and
          this page and its date will change before that cookie ever reaches
          your browser.
        </Callout>
      </>
    ),
  },
  {
    id: "managing",
    heading: "Blocking them anyway",
    body: (
      <>
        <P>
          You can refuse or delete cookies in your browser settings — every
          major browser has a page for it, usually under privacy or site data,
          and lets you do it for one site rather than all of them.
        </P>
        <P>
          What happens then is worth knowing in advance:{" "}
          <Term>you will not be able to sign in</Term>. Blocking Poko&apos;s
          cookies does not degrade the service, it stops it — you can read the
          marketing pages, and nothing behind a sign-in or an invite link will
          work. There is no version of an account that functions without a
          session.
        </P>
        <P>
          Signing out clears the session cookies yourself, which is the tidier
          way to leave a shared computer.
        </P>
      </>
    ),
  },
  {
    id: "elsewhere",
    heading: "Other pages, other cookies",
    body: (
      <P>
        Links from Poko to other people&apos;s sites are subject to their cookie
        practices, not ours — we have no control over what they set and this
        notice does not cover them. What we do with the data behind our own
        cookies is covered by the{" "}
        <TextLink href="/privacy">privacy policy</TextLink>, and your use of Poko
        is governed by the{" "}
        <TextLink href="/terms">terms and conditions</TextLink>.
      </P>
    ),
  },
  {
    id: "changes",
    heading: "Changes and questions",
    body: (
      <P>
        We update this notice when the cookies change, and the date at the top
        moves only when the text actually does. If something here does not match
        what you see in your browser, that is worth telling us about — write to{" "}
        <MailTo address={entity.privacyEmail} /> or use the{" "}
        <TextLink href="/contact">contact form</TextLink>.
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
          Poko stores what it needs to remember who you are and nothing else.
          No analytics, no advertising, no third-party trackers — and therefore
          no banner asking you to accept any.
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
