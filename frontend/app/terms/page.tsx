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
          These terms are a contract between you and the team behind{" "}
          <Term>{entity.name}</Term>. They apply whether you hold an account or
          joined a room from an invite link. You accept them by signing up or by
          taking a seat. Reach us at <MailTo address={entity.email} />.
        </P>
        <P>
          Poko is a hosted planning poker tool — an estimation aid, not a system
          of record. Keep your own copy of anything you cannot afford to lose.
          Our <TextLink href="/privacy">privacy policy</TextLink> and{" "}
          <TextLink href="/cookies">cookie notice</TextLink> are part of this
          agreement. If you do not agree, do not use Poko.
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
          You need to be at least 16. One account belongs to one person: use an
          email address you control, keep your password to yourself, and tell us
          at <MailTo address={entity.email} /> if someone else gets in.
          Anything done through your account counts as done by you.
        </P>
        <Callout>
          <Term>Treat an invite link like a key.</Term> Anyone holding it can
          take a seat, under any name, with no account — that is what makes
          joining one click. Share it with the people you want at the table, and
          make a new issue if a link goes astray. You are responsible for who
          you invite.
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
          Issue names, sprint names, display names and the cards you play stay
          yours. You give us only the permission we need to run the service:
          storing your content, showing it to others in the same room, and
          backing it up. That ends when you delete it. We do not use it to
          advertise and we do not sell it.
        </P>
        <Callout>
          Issue names are visible to everyone in the room, guests included.{" "}
          <Term>
            Do not put customer names, credentials, personal data about other
            people or anything under NDA into Poko
          </Term>{" "}
          — write &ldquo;checkout rewrite&rdquo;, not the client and the
          contract value.
        </Callout>
      </>
    ),
  },
  {
    id: "acceptable-use",
    heading: "What you may not do",
    body: (
      <>
        <Bullets>
          <li>Break the law, or store unlawful or harassing content.</li>
          <li>
            Try to read data that is not yours — including probing for a way to
            see a card before its round closes.
          </li>
          <li>
            Attack or degrade the service: denial of service, credential
            stuffing, scraping at volume.
          </li>
          <li>
            Work around rate limits or access controls, including by automating
            sign-ups.
          </li>
          <li>Resell or white-label Poko without our written agreement.</li>
          <li>Impersonate someone, including by taking a seat as them.</li>
        </Bullets>
        <P>
          Responsible security research is welcome. Tell us at{" "}
          <MailTo address={entity.email} /> and give us a chance to fix
          things first. Testing that degrades the service for others, or touches
          other people&apos;s data, is not covered by that welcome.
        </P>
      </>
    ),
  },
  {
    id: "plans",
    heading: "Plans and payment",
    body: (
      <P>
        <Term>Poko is free today.</Term> We take no payment and hold no card
        details, so nothing here obliges you to pay us. The paid plan on our{" "}
        <TextLink href="/#pricing">pricing page</TextLink> is not purchasable
        yet. Before it is, we will publish terms covering price, renewal and
        refunds, and you will accept those separately — signing up today commits
        you to nothing.
      </P>
    ),
  },
  {
    id: "availability",
    heading: "Availability and changes",
    body: (
      <P>
        We work to keep Poko up but do not promise guaranteed uptime. It may be
        unavailable for maintenance or for reasons outside our control. Poko
        changes: we add and occasionally remove features, and where a change
        materially reduces what the service does for you, we will give
        reasonable notice.
      </P>
    ),
  },
  {
    id: "ending-it",
    heading: "Ending it",
    body: (
      <>
        <P>
          Stop whenever you like. Your{" "}
          <TextLink href="/settings">settings page</TextLink> offers two
          different things:{" "}
          <Term>deactivate</Term> blocks sign-in but keeps your data and can be
          undone, while <Term>delete</Term> permanently removes the account, the
          issues you own, your seats and your cards.
        </P>
        <P>
          We may suspend or close an account that breaks these terms or harms
          other users. Unless the breach is serious, we will warn you first.{" "}
          <TextLink href="#your-content">Your content</TextLink>,{" "}
          <TextLink href="#our-rights">Our intellectual property</TextLink>,{" "}
          <TextLink href="#liability">Liability</TextLink> and{" "}
          <TextLink href="#law">Governing law</TextLink> survive the end of this
          agreement.
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
        and our licensors. These terms let you use the service, not own any part
        of it. Feedback you send us is welcome, and we may act on it freely.
      </P>
    ),
  },
  {
    id: "liability",
    heading: "Disclaimers and liability",
    body: (
      <>
        <P>
          Poko is provided <Term>as is</Term>. To the fullest extent the law
          allows, we exclude implied warranties, and we do not promise the
          service will be uninterrupted, error-free, or that your estimates will
          turn out to be right. What your team decides is your team&apos;s
          decision.
        </P>
        <P>
          Nothing here limits liability that cannot lawfully be limited, and
          your statutory rights as a consumer are unaffected. Subject to that,
          we are not liable for indirect or consequential loss, lost profits or
          lost data, and our total liability in any twelve-month period is
          limited to the greater of what you paid us in that period and USD 100.
          You are responsible for what you put into Poko and will cover us
          against claims arising from your breach of these terms.
        </P>
      </>
    ),
  },
  {
    id: "law",
    heading: "Governing law",
    body: (
      <P>
        This agreement is governed by {governing.law}, and disputes go to{" "}
        {governing.courts}. If you use Poko as a consumer, that does not deprive
        you of the mandatory protections of your own country, and you can bring
        proceedings locally where the law gives you that right. Come to us first
        — most things settle faster by email than by anyone filing anything.
      </P>
    ),
  },
  {
    id: "the-rest",
    heading: "The rest",
    body: (
      <Bullets>
        <li>
          These terms, with the privacy policy and cookie notice, are the whole
          agreement about Poko.
        </li>
        <li>
          If a court finds one clause unenforceable, the rest stays in force,
          and not enforcing something immediately is not giving it up.
        </li>
        <li>
          You may not transfer your rights without our consent. We may transfer
          ours if the business changes hands, and will tell you.
        </li>
        <li>
          We may update these terms. For a change that materially affects you we
          will email account holders first. Continuing to use Poko is
          acceptance; if you would rather not, close the account.
        </li>
      </Bullets>
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
          Use Poko to estimate work, do not attack it or fill it with things
          that belong under lock and key, and either of us can walk away.
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
