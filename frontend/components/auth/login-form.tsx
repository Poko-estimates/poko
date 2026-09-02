"use client"

import { Form } from "@base-ui/react/form"

import { PasswordField } from "@/components/auth/password-field"
import { SocialAuth } from "@/components/auth/social-auth"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

function LoginForm() {
  return (
    <div className="flex flex-col">
      <header className="text-center md:text-left">
        <h1 className="text-2xl leading-tight font-semibold tracking-tight text-primary sm:text-3xl">
          Sign in to Poko
        </h1>
      </header>

      <SocialAuth intent="signin" className="mt-7" />

      <Form className="mt-6 flex flex-col gap-4" onFormSubmit={() => {}}>
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
          className="mt-2 w-full"
        >
          Sign in
        </Button>
      </Form>
    </div>
  )
}

export { LoginForm }
