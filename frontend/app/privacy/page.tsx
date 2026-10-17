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
import {
  authorities,
  entity,
  lastUpdated,
  subprocessors,
} from "@/lib/legal/entity"

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "What Poko collects, why we hold it, how long we keep it, and the rights you have over it under the GDPR and Ghana's Data Protection Act.",
}

const sections: readonly LegalSection[] = [
  {
    id: "who-we-are",
    heading: "Who we are",
    body: (
      <>
        <P>
          Poko is a planning poker tool for agile teams, run by the{" "}
          <Term>{entity.name}</Term> team. We decide what gets collected and
          why, which makes us the data controller — and the ones answerable for
          it. Write to <MailTo address={entity.email} /> about anything
          on this page.
        </P>
        <P>
          This policy covers the EU and UK GDPR and Ghana&apos;s Data Protection
          Act, 2012 (Act 843). Your rights are the same under both.
        </P>
      </>
    ),
  },
  {
    id: "what-we-collect",
    heading: "What we collect",
    body: (
      <>
        <P>
          Only what it takes to run a round of planning poker. There is no
          analytics, no advertising and no third-party tracker on this site,
          which is why the <TextLink href="/cookies">cookie notice</TextLink> is
          so short.
        </P>
        <Bullets>
          <li>
            <Term>With an account:</Term> your email address, your password as a
            hash we cannot read, a display name if you give one, and your plan.
          </li>
          <li>
            <Term>As a guest:</Term> just the name you typed and an internal id
            for that session. No email, no password.
          </li>
          <li>
            <Term>When you estimate:</Term> your issues and sprints, who sat at
            each room, the cards played, and when each round opened and closed.
          </li>
          <li>
            <Term>When you email us:</Term> your message and your address, in
            our mailbox. There is no contact form and no database behind it.
          </li>
          <li>
            <Term>Technical data:</Term> our providers log your IP address, the
            time and your browser. Your IP also limits how many guest sessions
            one network can open. We build no profile from it.
          </li>
        </Bullets>
      </>
    ),
  },
  {
    id: "why-we-use-it",
    heading: "Why, and on what legal basis",
    body: (
      <>
        <P>
          Every use of personal data needs a lawful basis. Here is each one.
        </P>
        <Table>
          <thead>
            <tr>
              <th scope="col">What we do</th>
              <th scope="col">Legal basis</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Run your account, your rooms, rounds and votes</td>
              <td>Performing our contract with you</td>
            </tr>
            <tr>
              <td>Send confirmation and password-reset email</td>
              <td>Performing our contract with you</td>
            </tr>
            <tr>
              <td>Keep the service secure and available</td>
              <td>Our legitimate interest in a service that is not abused</td>
            </tr>
            <tr>
              <td>Reply when you write to us</td>
              <td>Our legitimate interest in answering you</td>
            </tr>
            <tr>
              <td>Keep records the law requires</td>
              <td>Legal obligation</td>
            </tr>
          </tbody>
        </Table>
        <P>
          We do not sell your data, share it with advertisers, or make automated
          decisions about you.
        </P>
      </>
    ),
  },
  {
    id: "who-can-see-your-vote",
    heading: "Who can see your vote",
    body: (
      <>
        <Callout>
          While a round is open, your card is readable by you and nobody else —
          not the other players, not the person who set up the room. The
          database refuses to hand it over, so there is no request anyone can
          send that reveals it early.
        </Callout>
        <P>
          When the round closes, every card becomes visible to everyone at that
          room at once. That is the point: the spread is what the conversation
          is about. Others can always see the name you joined under and whether
          you have played a card — just not what it is.
        </P>
      </>
    ),
  },
  {
    id: "who-we-share-with",
    heading: "Who we share it with",
    body: (
      <>
        <P>
          A few providers, who process data on our instructions only and may not
          use it for their own purposes.
        </P>
        <Table>
          <thead>
            <tr>
              <th scope="col">Provider</th>
              <th scope="col">What they do</th>
            </tr>
          </thead>
          <tbody>
            {subprocessors.map((provider) => (
              <tr key={provider.name}>
                <td className="font-medium text-primary!">{provider.name}</td>
                <td>{provider.role}</td>
              </tr>
            ))}
          </tbody>
        </Table>
        <P>
          Otherwise we disclose data only where the law requires it, or if the
          business changes hands — in which case you would be told first.
        </P>
      </>
    ),
  },
  {
    id: "transfers",
    heading: "Where your data goes",
    body: (
      <P>
        Poko runs from Ghana and its providers operate internationally, so your
        data may be processed outside your country. Where it leaves the EEA or
        the UK we rely on the European Commission&apos;s Standard Contractual
        Clauses, or on an adequacy decision. Ask us at{" "}
        <MailTo address={entity.email} /> for a copy of the safeguards.
      </P>
    ),
  },
  {
    id: "how-long",
    heading: "How long we keep it",
    body: (
      <>
        <Bullets>
          <li>
            <Term>Your account and everything in it</Term> lives until you
            delete the account. That removes your issues, your seats and your
            cards in the same step.
          </li>
          <li>
            <Term>Guest sessions</Term> go when the issue they belong to is
            deleted, cleared by a job that runs hourly.
          </li>
          <li>
            <Term>Email you send us</Term> stays in our mailbox while it is
            still useful. Ask if you want a thread removed.
          </li>
          <li>
            <Term>Server logs</Term> are kept briefly by our providers, then
            rotated out.
          </li>
        </Bullets>
        <Callout>
          <Term>Deactivating is not deleting.</Term> Deactivating blocks sign-in
          and keeps everything. Deleting is permanent. Both are on your{" "}
          <TextLink href="/settings">settings page</TextLink>.
        </Callout>
      </>
    ),
  },
  {
    id: "your-rights",
    heading: "Your rights",
    body: (
      <>
        <P>You can ask us to:</P>
        <Bullets>
          <li>Show you what we hold, and give you a copy.</li>
          <li>
            Correct it. Your name and password are editable on your{" "}
            <TextLink href="/settings">settings page</TextLink>.
          </li>
          <li>Delete it. Deleting your account does most of this yourself.</li>
          <li>
            Stop or limit how we use it, or hand it over in a portable format.
          </li>
          <li>Withdraw consent, wherever consent is what we relied on.</li>
        </Bullets>
        <P>
          Write to <MailTo address={entity.email} /> and we will answer
          within a month, free. If you are unhappy with how we handled it, you
          can complain to {authorities.ghana} or {authorities.eu}.
        </P>
      </>
    ),
  },
  {
    id: "security",
    heading: "How we protect it",
    body: (
      <P>
        Traffic is encrypted. Passwords are hashed and unreadable. Inside the
        database, who may read which row is enforced by the database itself
        rather than by the app remembering to ask — so a bug in our code cannot
        expose someone else&apos;s data. If a breach puts you at risk, we will
        tell the regulator within 72 hours and tell you directly.
      </P>
    ),
  },
  {
    id: "changes",
    heading: "Changes",
    body: (
      <P>
        We update this page when what we do changes, and the date at the top
        moves only when the text actually does. If a change affects you
        materially, we will email account holders rather than expect anyone to
        notice.
      </P>
    ),
  },
]

export default function Page() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="What Poko knows about you, and why"
      summary={
        <>
          An email address, a display name, the issues you estimate and the
          cards you play. No analytics, no trackers, nothing to sell.
        </>
      }
      lastUpdated={lastUpdated.privacy}
      sections={sections}
      related={[
        { label: "Terms and conditions", href: "/terms" },
        { label: "Cookie notice", href: "/cookies" },
      ]}
    />
  )
}
