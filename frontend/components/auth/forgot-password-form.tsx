"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { ArrowLeft, KeyRound, MailCheck } from "lucide-react"
import { Form } from "@base-ui/react/form"

import { FormAlert } from "@/components/auth/form-alert"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { requestPasswordReset } from "@/lib/auth/actions"

function ForgotPasswordForm() {
  const [pending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)

  function handleSubmit(values: Record<string, unknown>) {
    const email = String(values.email ?? "")
    setFormError(null)

    startTransition(async () => {
      const result = await requestPasswordReset(email)

      if (result.formError) setFormError(result.formError)
      else setSentTo(email)
    })
  }

  return (
    <div className="w-full max-w-md overflow-hidden rounded-3xl border border-border/70 bg-card px-6 py-10 shadow-[0_45px_90px_-45px_rgba(20,33,61,0.55)] sm:px-10">
      {sentTo === null ? (
        <>
          <Badge>
            <KeyRound className="size-5" aria-hidden="true" />
          </Badge>

          <h1 className="mt-6 text-2xl leading-tight font-semibold tracking-tight text-primary">
            Forgot your password?
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Enter the email you sign in with and we&apos;ll send you a link to
            reset your password.
          </p>

          <Form className="mt-7 flex flex-col gap-4" onFormSubmit={handleSubmit}>
            {formError && <FormAlert>{formError}</FormAlert>}

            <Field name="email">
              <FieldLabel>Email</FieldLabel>
              <Input
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                required
              />
              <FieldError match="valueMissing">
                Enter the email you signed up with.
              </FieldError>
              <FieldError match="typeMismatch">
                That doesn&apos;t look like an email address.
              </FieldError>
            </Field>

            <Button
              type="submit"
              variant="secondary"
              size="xl"
              disabled={pending}
              className="mt-2 w-full"
            >
              {pending ? "Sending…" : "Send reset link"}
            </Button>
          </Form>
        </>
      ) : (
        <>
          <Badge>
            <MailCheck className="size-5" aria-hidden="true" />
          </Badge>

          <h1 className="mt-6 text-2xl leading-tight font-semibold tracking-tight text-primary">
            Check your inbox
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            If an account exists for{" "}
            <span className="font-medium text-primary">{sentTo}</span>, a reset
            link is on its way. It expires in 60 minutes.
          </p>

          <Button
            type="button"
            variant="outline"
            size="xl"
            className="mt-7 w-full"
            onClick={() => setSentTo(null)}
          >
            Use a different email
          </Button>
        </>
      )}

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

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-secondary/20 text-primary ring-1 ring-secondary/40">
      {children}
    </span>
  )
}

export { ForgotPasswordForm }
