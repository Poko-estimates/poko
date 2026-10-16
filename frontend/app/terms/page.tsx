import type { Metadata } from "next"

import { LegalPage, type LegalSection } from "@/components/legal/legal-page"
import {
  Bullets,
  Callout,
  MailTo,
  P,
  Term,
  TextLink,
} from "@/components/legal/prose"
import { entity, governing, lastUpdated } from "@/lib/legal/entity"

export const metadata: Metadata = {
  title: "Terms and conditions",
  description:
    "The agreement between you and Poko: what the service does, what you may and may not do with it, who owns what, and how either of us can end it.",
}

const sections: readonly LegalSection[] = [
  {
    id: "the-agreement",
    heading: "The agreement",
    body: (
      <>
        <P>
          These terms are a contract between you and the team operating{" "}
          <Term>{entity.name}</Term> — &ldquo;we&rdquo;, &ldquo;us&rdquo;,
          &ldquo;Poko&rdquo;. They apply whenever you use Poko, whether you hold
          an account or joined a room from an invite link as a guest. We can be
          reached at <MailTo address={entity.legalEmail} />.
        </P>
        <P>
          You accept them by creating an account or by taking a seat at a room.
          If you are agreeing on behalf of a company, you confirm you are
          authorised to bind it, and &ldquo;you&rdquo; means that company.
        </P>
        <P>
          Our <TextLink href="/privacy">privacy policy</TextLink> and{" "}
          <TextLink href="/cookies">cookie notice</TextLink> form part of this
          agreement. Read them — the privacy policy is where the substance about
          your data lives.
        </P>
        <P>
          Poko itself is a hosted planning poker tool: you create issues, share
          a link, and your team plays a card each. It is an estimation aid, not
          a system of record — an estimate it stores is your team&apos;s
          judgement rather than ours, so keep your own copy of anything you
          cannot afford to lose. If you do not agree to these terms, do not use
          Poko.
        </P>
      </>
    ),
  },
  {
    id: "accounts",
    heading: "Accounts and guests",
    body: (
      <>
        <P>
          You need to be at least 16 to hold an account. One account belongs to
          one person: do not share your credentials, and do not let someone else
          use yours.
        </P>
        <Bullets>
          <li>
            Give an <Term>email address you control</Term>. It is how we confirm
            the account is yours and how you get back in if you lose the
            password.
          </li>
          <li>
            Keep your <Term>password</Term> to yourself. Anything done through
            your account is treated as done by you, unless you tell us it was
            not.
          </li>
          <li>
            Tell us promptly at <MailTo address={entity.legalEmail} /> if you
            think someone else has got into your account.
          </li>
        </Bullets>
        <P>
          Guests need none of that. A room&apos;s invite link is the invitation,
          and anyone holding it can take a seat under a name of their choosing.
          If you invite guests, you are responsible for who you invite and for
          what they do in your room.
        </P>
        <Callout>
          <Term>Treat an invite link like a key.</Term> There is no second check
          behind it, by design — that is what lets a colleague join in one click
          from a chat message. Share it with the people you want at the table
          and not more widely, and create a new issue if a link has gone
          somewhere it should not have.
        </Callout>
      </>
    ),
  },
  {
    id: "your-content",
    heading: "Your content",
    body: (
      <>
        <P>
          Issue names, sprint names, display names, the cards you play and
          anything else you put into Poko remain yours. We claim no ownership of
          them.
        </P>
        <P>
          You grant us the limited licence we need to actually run the service:
          to store your content, to show it to the other people seated at the
          same room, and to back it up. That licence exists only to operate Poko
          for you and ends when you delete the content or your account. We do
          not use your content to advertise, and we do not sell it.
        </P>
        <Callout>
          Issue names are visible to everyone in the room, including guests.{" "}
          <Term>
            Poko is not the place for customer names, credentials, personal data
            about third parties or anything under an NDA
          </Term>{" "}
          — write &ldquo;checkout rewrite&rdquo;, not the client&apos;s name and
          contract value.
        </Callout>
        <P>
          You are responsible for having the right to put your content into Poko
          and for it not breaking the law or anyone else&apos;s rights.
        </P>
      </>
    ),
  },
  {
    id: "acceptable-use",
    heading: "What you may not do",
    body: (
      <>
        <P>Using Poko, you agree not to:</P>
        <Bullets>
          <li>
            Break the law with it, or use it to store or share unlawful,
            infringing, harassing or deliberately harmful content.
          </li>
          <li>
            Try to read data that is not yours — including probing for a way to
            see a card before its round closes, or to reach a room you were not
            invited to.
          </li>
          <li>
            Attack the service: denial of service, credential stuffing, scraping
            at volume, or anything that degrades it for other people.
          </li>
          <li>
            Work around technical limits, rate limits or access controls,
            including by automating account or guest-session creation.
          </li>
          <li>
            Resell, sublicense or white-label Poko without our written
            agreement.
          </li>
          <li>
            Impersonate someone else, including by taking a seat under their
            name.
          </li>
        </Bullets>
        <P>
          Security research is welcome when it is responsible. If you think you
          have found a vulnerability, tell us at{" "}
          <MailTo address={entity.legalEmail} /> and give us a reasonable chance
          to fix it before telling anyone else. Testing that degrades the
          service for other users or touches other people&apos;s data is not
          covered by that welcome.
        </P>
      </>
    ),
  },
  {
    id: "plans",
    heading: "Plans and payment",
    body: (
      <>
        <P>
          <Term>Poko is free to use today.</Term> We take no payment, hold no
          card details and run no subscriptions, so nothing in this agreement
          obliges you to pay us anything.
        </P>
        <P>
          The paid plan shown on our{" "}
          <TextLink href="/#pricing">pricing page</TextLink> is not yet
          purchasable. Before it is, we will publish terms covering price,
          renewal, cancellation and refunds, and you will have to accept them
          separately — signing up today does not commit you to a future plan or
          a future price.
        </P>
      </>
    ),
  },
  {
    id: "availability",
    heading: "Availability and changes",
    body: (
      <>
        <P>
          We work to keep Poko available and quick, but we do not offer a
          guaranteed uptime commitment on these terms. The service may be
          unavailable during maintenance, or because something outside our
          control has broken.
        </P>
        <P>
          Poko changes. We add, alter and occasionally remove features. Where a
          change materially reduces what the service does for you, we will give
          reasonable notice rather than removing it from under you.
        </P>
      </>
    ),
  },
  {
    id: "ending-it",
    heading: "Ending it",
    body: (
      <>
        <P>
          You can stop using Poko whenever you like. Your{" "}
          <TextLink href="/settings">settings page</TextLink> offers two
          different things, and the difference matters:
        </P>
        <Bullets>
          <li>
            <Term>Deactivate</Term> blocks sign-in and keeps your data. It is
            reversible — write to us to reopen the account.
          </li>
          <li>
            <Term>Delete</Term> removes the account, the issues you own, the
            seats you took and the cards you played. It is immediate and cannot
            be undone.
          </li>
        </Bullets>
        <P>
          We may suspend or close an account that breaks these terms, that is
          being used to harm other users or the service, or where we are
          required to by law. Except where the breach is serious or urgent, we
          will warn you first and give you a chance to put it right.
        </P>
        {/* Named rather than numbered: the numbering is derived from the
            section order, so "section 12" would quietly point somewhere else
            the first time a section is inserted above it. */}
        <P>
          <TextLink href="#your-content">Your content</TextLink>,{" "}
          <TextLink href="#our-rights">Our intellectual property</TextLink>,{" "}
          <TextLink href="#disclaimers">Disclaimers</TextLink>,{" "}
          <TextLink href="#liability">Liability</TextLink> and{" "}
          <TextLink href="#law">Governing law and disputes</TextLink> survive
          the end of this agreement.
        </P>
      </>
    ),
  },
  {
    id: "our-rights",
    heading: "Our intellectual property",
    body: (
      <P>
        Poko — the software, the site, the name and the branding — belongs to us
        and our licensors. These terms give you permission to use the service,
        not ownership of any part of it. You may not copy, decompile or create
        derivative works from the software except where the law expressly allows
        it regardless of contract. Feedback you send us is welcome, and we may
        act on it freely and without owing you anything for it.
      </P>
    ),
  },
  {
    id: "disclaimers",
    heading: "Disclaimers",
    body: (
      <>
        <P>
          Poko is provided <Term>as is</Term> and <Term>as available</Term>. To
          the fullest extent the law permits, we exclude implied warranties of
          merchantability, fitness for a particular purpose and
          non-infringement.
        </P>
        <P>
          We do not warrant that the service will be uninterrupted or
          error-free, that defects will be corrected, or that estimates produced
          in it will turn out to be accurate. Planning poker is a conversation
          tool; what your team decides is your team&apos;s decision.
        </P>
      </>
    ),
  },
  {
    id: "liability",
    heading: "Liability",
    body: (
      <>
        <P>
          Nothing in these terms limits liability that cannot lawfully be
          limited — including for death or personal injury caused by negligence,
          for fraud, and for anything a consumer protection law says may not be
          excluded. Your statutory rights as a consumer are unaffected.
        </P>
        <P>
          Subject to that, we are not liable for indirect or consequential loss,
          lost profits, lost revenue, lost business, lost goodwill, or the cost
          of substitute services. Our total liability arising out of or in
          connection with this agreement, in any twelve-month period, is limited
          to the greater of the fees you paid us in that period and USD 100.
        </P>
        <P>
          You are responsible for the content you put into Poko and for the use
          your team makes of it, and you will cover us against third-party
          claims that arise from your breach of these terms — provided we tell
          you about the claim promptly and let you take part in defending it.
        </P>
      </>
    ),
  },
  {
    id: "law",
    heading: "Governing law and disputes",
    body: (
      <>
        <P>
          This agreement is governed by {governing.law}, and disputes about it
          go to {governing.courts}.
        </P>
        <P>
          If you use Poko as a consumer, that choice does not deprive you of the
          protection of the mandatory laws of the country you live in, and you
          can also bring proceedings in your local courts where the law gives
          you that right.
        </P>
        <P>
          Come to us first. Most things are settled faster by email to{" "}
          <MailTo address={entity.legalEmail} /> than by anyone filing anything.
        </P>
      </>
    ),
  },
  {
    id: "the-rest",
    heading: "The rest",
    body: (
      <>
        <Bullets>
          <li>
            These terms, with the privacy policy and cookie notice, are the
            whole agreement between us about Poko.
          </li>
          <li>
            If a court finds one clause unenforceable, the rest stays in force.
          </li>
          <li>
            Not enforcing something immediately is not giving it up.
          </li>
          <li>
            You may not transfer your rights under this agreement without our
            consent. We may transfer ours if the business changes hands, and
            will tell you if we do.
          </li>
          <li>
            We may update these terms. The date at the top is when they last
            changed, and for a change that materially affects you we will give
            account holders notice by email before it takes effect. Continuing
            to use Poko after that is acceptance; if you would rather not, close
            the account.
          </li>
        </Bullets>
      </>
    ),
  },
]

export default function Page() {
  return (
    <LegalPage
      eyebrow="Terms"
      title="The agreement between you and Poko"
      summary={
        <>
          The short version: use Poko for estimating work, do not attack it or
          fill it with things that belong under lock and key, and either of us
          can walk away. The long version is below and is the one that binds.
        </>
      }
      lastUpdated={lastUpdated.terms}
      sections={sections}
      related={[
        { label: "Privacy policy", href: "/privacy" },
        { label: "Cookie notice", href: "/cookies" },
      ]}
    />
  )
}
