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
    "What Poko collects when you estimate with your team, why we hold it, how long we keep it, and the rights you have over it under the GDPR and Ghana's Data Protection Act.",
}

const sections: readonly LegalSection[] = [
  {
    id: "who-we-are",
    heading: "Who we are",
    body: (
      <>
        <P>
          Poko is a planning poker tool for agile teams. It is operated by the{" "}
          <Term>{entity.name}</Term> team, who are the data controller for the
          personal data described here — meaning we decide what is collected and
          why, and we are the ones answerable for it. Reach us at{" "}
          <MailTo address={entity.privacyEmail} />.
        </P>
        <P>
          This policy is written to satisfy both the EU and UK General Data
          Protection Regulation and Ghana&apos;s Data Protection Act, 2012 (Act
          843). Where the two use different words for the same idea we have used
          the GDPR&apos;s, and the rights set out under{" "}
          <TextLink href="#your-rights">Your rights</TextLink> exist under both.
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
          Poko collects what it needs to run a round of planning poker, and
          nothing gathered on spec. There is no analytics service, no
          advertising network and no third-party tracker anywhere on this site —
          which is why the <TextLink href="/cookies">cookie notice</TextLink> is
          as short as it is.
        </P>

        <h3 className="mt-2 text-base font-semibold text-primary">
          If you create an account
        </h3>
        <Bullets>
          <li>
            Your <Term>email address</Term>, which identifies the account and is
            where confirmation and password-reset messages go.
          </li>
          <li>
            Your <Term>password</Term>, stored only as a cryptographic hash. We
            cannot read it, and neither could anyone who obtained the database.
          </li>
          <li>
            A <Term>display name</Term>, if you give one. It is a label shown to
            the people in your rooms; it never decides what you can access.
          </li>
          <li>
            Your <Term>plan</Term> and the date the account was created.
          </li>
        </Bullets>

        <h3 className="mt-2 text-base font-semibold text-primary">
          If you join a room as a guest
        </h3>
        <P>
          Guests do not create accounts. Opening an invite link and choosing a
          name gives you an anonymous session: we store the{" "}
          <Term>display name</Term> you typed and an internal identifier for
          that session. No email address, no password, and nothing that carries
          over to another room unless you open its link too.
        </P>

        <h3 className="mt-2 text-base font-semibold text-primary">
          When you estimate
        </h3>
        <Bullets>
          <li>
            The <Term>issues and sprints</Term> you create — their names, the
            deck chosen and how they are ordered. Whatever you type into an
            issue name is stored as you typed it.
          </li>
          <li>
            The <Term>seats</Term> at each room: who joined, under what name,
            and when.
          </li>
          <li>
            The <Term>cards</Term> played: your estimate in each round, when you
            played it, and the agreed estimate once the round closes.
          </li>
          <li>
            <Term>Round timing</Term> — when a round opened, its timebox if it
            has one, when it closed and why.
          </li>
        </Bullets>

        <h3 className="mt-2 text-base font-semibold text-primary">
          When you contact us
        </h3>
        <P>
          There is no contact form — the contact page is a button that opens
          your own mail client. Writing to us means we hold what your message
          contains, and what your mail client sends with it: your address, the
          name it puts on your mail, and the message itself. It lives in our
          mailbox and nowhere else. It goes into no database of ours.
        </P>

        <h3 className="mt-2 text-base font-semibold text-primary">
          Technical data
        </h3>
        <P>
          Our hosting and database providers keep server logs containing your{" "}
          <Term>IP address</Term>, the time of the request and your
          browser&apos;s user agent. Your IP address is also used to rate limit
          guest sign-ins, so that one network cannot open unlimited anonymous
          sessions. We do not build a profile from any of it.
        </P>
      </>
    ),
  },
  {
    id: "why-we-use-it",
    heading: "Why we use it, and on what legal basis",
    body: (
      <>
        <P>
          Under the GDPR, every use of personal data needs a lawful basis. Under
          Act 843 the equivalent requirement is that processing be lawful,
          necessary and not excessive. Here is each use, plainly.
        </P>
        <Table>
          <thead>
            <tr>
              <th scope="col">What we do</th>
              <th scope="col">Why</th>
              <th scope="col">Lawful basis</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Create and run your account</td>
              <td>
                You cannot sign in, own issues or keep them between sessions
                without one.
              </td>
              <td>Performance of our contract with you</td>
            </tr>
            <tr>
              <td>Run rooms, rounds and votes</td>
              <td>
                This is the service. Cards, seats and estimates are what you
                came for.
              </td>
              <td>Performance of our contract with you</td>
            </tr>
            <tr>
              <td>Send account emails</td>
              <td>
                Confirming an address and resetting a password are part of
                keeping the account yours.
              </td>
              <td>Performance of our contract with you</td>
            </tr>
            <tr>
              <td>Keep the service secure and available</td>
              <td>
                Server logs and rate limiting are how abuse gets spotted and
                stopped.
              </td>
              <td>
                Our legitimate interest in a service that works and is not
                abused
              </td>
            </tr>
            <tr>
              <td>Read and answer your messages</td>
              <td>
                You asked us something and expect a reply, which we cannot send
                without your address.
              </td>
              <td>
                Our legitimate interest in answering someone who has written to
                us
              </td>
            </tr>
            <tr>
              <td>Meet legal and accounting obligations</td>
              <td>
                Records we are required to keep, including for any paid
                subscription.
              </td>
              <td>Compliance with a legal obligation</td>
            </tr>
          </tbody>
        </Table>
        <P>
          We do not sell personal data, we do not share it with advertisers, and
          we do not make automated decisions that produce legal or similarly
          significant effects about you.
        </P>
      </>
    ),
  },
  {
    id: "who-can-see-your-vote",
    heading: "Who can see your vote",
    body: (
      <>
        <P>
          This gets its own section because it is the thing Poko exists to get
          right, and the thing most likely to be assumed rather than checked.
        </P>
        <Callout>
          While a round is open, the card you played is readable by you and
          nobody else — not the other people in the room, not the room&apos;s
          owner. That is enforced by row-level security in the database rather
          than by the interface declining to draw it, so there is no request
          anyone can send that returns it early.
        </Callout>
        <P>
          When the round closes, every card in that round becomes visible to
          everyone seated at that room, at once. That is the point of the
          exercise: the spread is what the conversation is about. Closed rounds
          stay readable to the room afterwards, so a team can look back at how
          an estimate was reached.
        </P>
        <P>
          The others in a room can always see the display name you joined under
          and whether you have played a card yet — just not what it is until the
          round closes. Choose a name you are happy for them to see.
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
          We use a small number of service providers to run Poko. They process
          personal data on our instructions only, under contracts that require
          them to keep it confidential and secure, and they may not use it for
          their own purposes.
        </P>
        <Table>
          <thead>
            <tr>
              <th scope="col">Provider</th>
              <th scope="col">What they do</th>
              <th scope="col">What they handle</th>
            </tr>
          </thead>
          <tbody>
            {subprocessors.map((provider) => (
              <tr key={provider.name}>
                <td className="font-medium text-primary!">{provider.name}</td>
                <td>{provider.role}</td>
                <td>{provider.data}</td>
              </tr>
            ))}
          </tbody>
        </Table>
        <P>
          Beyond that, we disclose personal data only where the law requires it,
          where it is necessary to establish or defend a legal claim, or where
          the business itself changes hands — in which case you would be told
          before your data moved, and this policy would keep applying to it.
        </P>
      </>
    ),
  },
  {
    id: "transfers",
    heading: "Where your data goes",
    body: (
      <>
        <P>
          Poko is operated from Ghana and its providers operate
          internationally, so your data may be processed outside the country you
          are in — including outside the European Economic Area and the United
          Kingdom.
        </P>
        <P>
          Where data leaves the EEA or the UK we rely on the European
          Commission&apos;s Standard Contractual Clauses, with the UK Addendum
          where the transfer starts in the UK, or on an adequacy decision where
          one covers the destination. Where Act 843 governs a transfer out of
          Ghana, we transfer only where the destination affords a comparable
          level of protection or where you have consented.
        </P>
        <P>
          Ask us at <MailTo address={entity.privacyEmail} /> for a copy of the
          safeguards covering a particular transfer.
        </P>
      </>
    ),
  },
  {
    id: "how-long",
    heading: "How long we keep it",
    body: (
      <>
        <P>
          We keep personal data for as long as it serves the purpose it was
          collected for, and then we stop.
        </P>
        <Bullets>
          <li>
            <Term>Account data</Term> lives as long as the account does. Delete
            the account and it goes with it.
          </li>
          <li>
            <Term>Issues, sprints, seats and votes</Term> stay while the account
            that owns them stays. Deleting your account removes the issues you
            own, the seats you took and the cards you played in the same
            operation — the deletion cascades inside the database rather than
            being a tidy-up job that might not run.
          </li>
          <li>
            <Term>Guest sessions</Term> hold only a display name and a seat.
            Deleting the issue removes the seat, and a scheduled job then
            deletes the session itself — display name included — usually within
            the hour. A guest still seated at a live issue is kept, because the
            room has to be able to show who is at the table.
          </li>
          <li>
            <Term>Email you send us</Term> stays in our mailbox while it is
            still useful — a thread we may need to pick up again, a bug report
            that is not fixed yet — and we clear out correspondence we no
            longer need. Deleting your account does not reach into our mailbox,
            so ask us if you want a thread removed too.
          </li>
          <li>
            <Term>Server logs</Term> are kept for a short period by our
            providers — typically days to a few weeks — and then rotated out.
          </li>
          <li>
            <Term>Billing records</Term>, if you subscribe to a paid plan, are
            kept as long as tax and accounting law requires.
          </li>
        </Bullets>
        <Callout>
          <Term>Deactivating is not deleting.</Term> Deactivating blocks sign-in
          but keeps everything. Deleting is irreversible and removes the data
          described above. Both are on your{" "}
          <TextLink href="/settings">settings page</TextLink>, which says which
          is which before you confirm.
        </Callout>
      </>
    ),
  },
  {
    id: "your-rights",
    heading: "Your rights",
    body: (
      <>
        <P>
          Under the GDPR and under Act 843 you have rights over the personal
          data we hold about you. You can:
        </P>
        <Bullets>
          <li>
            <Term>Ask what we hold</Term> and get a copy of it.
          </li>
          <li>
            <Term>Correct it</Term> if it is wrong. Your display name and
            password are editable directly on the{" "}
            <TextLink href="/settings">settings page</TextLink>.
          </li>
          <li>
            <Term>Have it erased</Term>. Deleting your account does most of this
            yourself, immediately; write to us for anything it does not cover.
          </li>
          <li>
            <Term>Restrict or object to</Term> processing we carry out on the
            basis of our legitimate interests.
          </li>
          <li>
            <Term>Take it elsewhere</Term> in a structured, machine-readable
            form.
          </li>
          <li>
            <Term>Withdraw consent</Term> where consent is what we relied on,
            without affecting anything done before you withdrew it.
          </li>
        </Bullets>
        <P>
          Write to <MailTo address={entity.privacyEmail} /> and we will respond
          within one month. There is no charge, and we will not ask for more
          identification than we need to be sure the request is yours.
        </P>
        <P>
          If you are not satisfied with how we handled a request, you can
          complain to {authorities.ghana} or to {authorities.eu}. We would
          rather you came to us first, but you are not required to.
        </P>
      </>
    ),
  },
  {
    id: "security",
    heading: "How it is protected",
    body: (
      <>
        <P>
          Traffic to Poko is encrypted in transit. Passwords are stored hashed
          and are never readable, by us or by anyone else. Access to production
          data is limited to the people who need it to run the service.
        </P>
        <P>
          Inside the database, who may read which row is settled by row-level
          security policies rather than by the queries the application happens
          to send. That distinction is the point: a mistake in a query cannot
          expose somebody else&apos;s data if the database would refuse to
          return it anyway. The rules that matter most — a vote stays private
          until its round closes, a room is visible only to the people seated at
          it — are covered by automated tests that fail the build when they stop
          holding.
        </P>
        <P>
          No service can promise to be impenetrable and we do not. If a breach
          occurs that is likely to result in a risk to your rights, we will
          notify the relevant supervisory authority within 72 hours and tell you
          directly where the risk is high.
        </P>
      </>
    ),
  },
  {
    id: "children",
    heading: "Children",
    body: (
      <P>
        Poko is a workplace tool and is not directed at children. We do not
        knowingly collect personal data from anyone under 16. If you believe a
        child has given us personal data, write to{" "}
        <MailTo address={entity.privacyEmail} /> and we will delete it.
      </P>
    ),
  },
  {
    id: "changes",
    heading: "Changes to this policy",
    body: (
      <P>
        We update this policy when what we do changes — a new provider, or a
        feature that collects something it did not before. The date at the top
        is when the text last changed, and it moves only when the text is
        actually revised. Where a change materially affects you, we will tell
        account holders by email rather than relying on anyone to notice a date.
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
          Poko holds an email address, a display name, the issues you estimate
          and the cards you play. No analytics, no trackers, nothing to sell.
          This page is the long version.
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
