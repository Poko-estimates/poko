import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft, Check } from "lucide-react"

import { DangerZone } from "@/components/settings/danger-zone"
import { PasswordForm } from "@/components/settings/password-form"
import { ProfileForm } from "@/components/settings/profile-form"
import {
  SettingsRow,
  SettingsSection,
} from "@/components/settings/settings-section"
import { AppHeader } from "@/components/site/app-header"
import { Container } from "@/components/site/container"
import { UserMenu } from "@/components/site/user-menu"
import { tierLabels } from "@/lib/account/model"
import { getAccount } from "@/lib/account/queries"

export const metadata: Metadata = {
  title: "Settings",
  description: "Your Poko account.",
}

const planFeatures = {
  free: ["Unlimited issues", "Invite anyone by link", "Blind voting and timeboxes"],
  pro: ["Everything in Free", "Round history", "Jira and Linear sync"],
} as const

export default async function Page() {
  const account = await getAccount()

  // The proxy guards this route; this keeps the page correct on its own.
  if (!account) redirect("/login")

  return (
    <div className="flex flex-1 flex-col bg-surface">
      <AppHeader
        action={
          <UserMenu
            displayName={account.displayName}
            email={account.email}
            initials={account.initials}
          />
        }
      />

      <main className="flex-1 py-8 sm:py-12">
        <Container className="flex max-w-3xl flex-col gap-6">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-muted-foreground underline-offset-4 transition-colors outline-none hover:text-primary hover:underline focus-visible:ring-3 focus-visible:ring-ring/40"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to issues
            </Link>
            <h1 className="mt-3 text-2xl leading-tight font-semibold tracking-tight text-primary sm:text-3xl">
              Settings
            </h1>
          </div>

          <SettingsSection
            title="Plan"
            description="What your account includes."
            action={
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-secondary/15 px-3 py-1 text-xs font-semibold tracking-wide text-primary uppercase">
                {tierLabels[account.tier]}
              </span>
            }
          >
            <ul className="flex flex-col gap-2">
              {planFeatures[account.tier].map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2.5 text-sm text-primary"
                >
                  <Check
                    className="mt-0.5 size-4 shrink-0 text-success"
                    aria-hidden="true"
                  />
                  {feature}
                </li>
              ))}
            </ul>

            {account.tier === "free" && (
              <p className="mt-4 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
                Billing isn&apos;t connected yet, so every account is on Free —
                there&apos;s nothing to upgrade to or pay for.
              </p>
            )}
          </SettingsSection>

          <SettingsSection
            title="Your details"
          >
            <ProfileForm
              initialName={account.displayName}
              email={account.email}
            />
          </SettingsSection>

          <SettingsSection title="Account">
            <dl className="flex flex-col">
              <SettingsRow label="Account type">
                {account.isGuest ? "Guest" : "Email and password"}
              </SettingsRow>
              <SettingsRow label="Joined">
                {account.joinedAt
                  ? new Date(account.joinedAt).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "—"}
              </SettingsRow>
            </dl>
          </SettingsSection>

          {!account.isGuest && (
            <SettingsSection
              title="Password"
              description="Changing it won't sign you out of this device."
            >
              <PasswordForm />
            </SettingsSection>
          )}

          <SettingsSection
            title="Danger zone"
            description="Both of these take effect immediately."
            tone="danger"
          >
            <DangerZone email={account.email} />
          </SettingsSection>
        </Container>
      </main>
    </div>
  )
}
