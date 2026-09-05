"use client"

import { useState, useTransition } from "react"
import { Form } from "@base-ui/react/form"

import { FormAlert } from "@/components/auth/form-alert"
import { PasswordField } from "@/components/auth/password-field"
import { SocialAuth } from "@/components/auth/social-auth"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { signIn } from "@/lib/auth/actions"

function LoginForm() {
  const [pending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)

  function handleSubmit(values: Record<string, unknown>) {
    setFormError(null)

    startTransition(async () => {
      // A successful sign-in redirects, so control only returns on failure.
      const result = await signIn({
        email: String(values.email ?? ""),
        password: String(values.password ?? ""),
      })

      if (result?.formError) setFormError(result.formError)
    })
  }

  return (
    <div className="flex flex-col">
      <header className="text-center md:text-left">
        <h1 className="text-2xl leading-tight font-semibold tracking-tight text-primary sm:text-3xl">
          Sign in to Poko
        </h1>
      </header>

      <SocialAuth intent="signin" className="mt-7" />

      <Form className="mt-6 flex flex-col gap-4" onFormSubmit={handleSubmit}>
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

        <PasswordField
          autoComplete="current-password"
          placeholder="••••••••"
          withForgotLink
        />

        <Button
          type="submit"
          variant="secondary"
          size="xl"
          disabled={pending}
          className="mt-2 w-full"
        >
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </Form>
    </div>
  )
}

export { LoginForm }
