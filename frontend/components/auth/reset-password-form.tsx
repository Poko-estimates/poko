"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { ArrowLeft, KeyRound } from "lucide-react"
import { Form } from "@base-ui/react/form"

import { FormAlert } from "@/components/auth/form-alert"
import { PasswordField } from "@/components/auth/password-field"
import { Button } from "@/components/ui/button"
import { updatePassword } from "@/lib/auth/actions"

/**
 * Reached through the emailed reset link, which signs the visitor in via
 * `/auth/confirm` before landing them here.
 */
function ResetPasswordForm() {
  const [pending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)

  function handleSubmit(values: Record<string, unknown>) {
    setFormError(null)

    startTransition(async () => {
      const result = await updatePassword(String(values.password ?? ""))
      if (result?.formError) setFormError(result.formError)
    })
  }

  return (
    <div className="w-full max-w-md overflow-hidden rounded-3xl border border-border/70 bg-card px-6 py-10 shadow-[0_45px_90px_-45px_rgba(20,33,61,0.55)] sm:px-10">
      <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-secondary/20 text-primary ring-1 ring-secondary/40">
        <KeyRound className="size-5" aria-hidden="true" />
      </span>

      <h1 className="mt-6 text-2xl leading-tight font-semibold tracking-tight text-primary">
        Choose a new password
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Pick something you haven&apos;t used before. You&apos;ll stay signed in
        on this device.
      </p>

      <Form className="mt-7 flex flex-col gap-4" onFormSubmit={handleSubmit}>
        {formError && <FormAlert>{formError}</FormAlert>}

        <PasswordField
          label="New password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          description="Use 8 or more characters, mixing letters and numbers."
          minLength={8}
        />

        <Button
          type="submit"
          variant="secondary"
          size="xl"
          disabled={pending}
          className="mt-2 w-full"
        >
          {pending ? "Saving…" : "Save password"}
        </Button>
      </Form>

      <div className="mt-7 border-t border-border pt-6 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground transition-colors outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to sign in
        </Link>
      </div>
    </div>
  )
}

export { ResetPasswordForm }
