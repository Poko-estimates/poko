"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { MailCheck } from "lucide-react"
import { Form } from "@base-ui/react/form"

import { FormAlert } from "@/components/auth/form-alert"
import { PasswordField } from "@/components/auth/password-field"
import { SocialAuth } from "@/components/auth/social-auth"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { signUp } from "@/lib/auth/actions"

function SignupForm() {
  const [pending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)

  function handleSubmit(values: Record<string, unknown>) {
    const email = String(values.email ?? "")
    setFormError(null)

    startTransition(async () => {
      // With confirmations off the action redirects instead of returning.
      const result = await signUp({
        name: String(values.name ?? ""),
        email,
        password: String(values.password ?? ""),
      })

      if (result?.formError) setFormError(result.formError)
      else if (result?.status === "check-email") setSentTo(email)
    })
  }

  if (sentTo) return <ConfirmationNotice email={sentTo} />

  return (
    <div className="flex flex-col">
      <header className="text-center md:text-left">
        <h1 className="text-2xl leading-tight font-semibold tracking-tight text-primary sm:text-3xl">
          Create your account
        </h1>
      </header>

      <SocialAuth intent="signup" className="mt-7" />

      <Form className="mt-6 flex flex-col gap-4" onFormSubmit={handleSubmit}>
        {formError && <FormAlert>{formError}</FormAlert>}

        <Field name="name">
          <FieldLabel>Full name</FieldLabel>
          <Input
            type="text"
            autoComplete="name"
            placeholder="Jane Doe"
            required
          />
          <FieldError match="valueMissing">
            Tell your team who you are.
          </FieldError>
        </Field>

        <Field name="email">
          <FieldLabel>Email</FieldLabel>
          <Input
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            required
          />
          <FieldError match="valueMissing">
            We need an email to create your account.
          </FieldError>
          <FieldError match="typeMismatch">
            That doesn&apos;t look like an email address.
          </FieldError>
        </Field>

        <PasswordField
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
          {pending ? "Creating account…" : "Create account"}
        </Button>

        <p className="text-center text-xs leading-relaxed text-muted-foreground md:text-left">
          By creating an account you agree to our{" "}
          <Link
            href="/terms"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Terms
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </Form>
    </div>
  )
}

/** Shown when the project requires email confirmation before the first sign-in. */
function ConfirmationNotice({ email }: { email: string }) {
  return (
    <div className="flex flex-col text-center md:text-left">
      <span className="inline-flex size-11 items-center justify-center self-center rounded-2xl bg-secondary/20 text-primary ring-1 ring-secondary/40 md:self-start">
        <MailCheck className="size-5" aria-hidden="true" />
      </span>

      <h1 className="mt-6 text-2xl leading-tight font-semibold tracking-tight text-primary">
        Confirm your email
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        We sent a link to{" "}
        <span className="font-medium text-primary">{email}</span>. Click it and
        you&apos;ll be signed in and ready to run your first session.
      </p>
    </div>
  )
}

export { SignupForm }
