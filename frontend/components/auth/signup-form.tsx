"use client"

import Link from "next/link"
import { Form } from "@base-ui/react/form"

import { PasswordField } from "@/components/auth/password-field"
import { SocialAuth } from "@/components/auth/social-auth"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

function SignupForm() {
  return (
    <div className="flex flex-col">
      <header className="text-center md:text-left">
        <h1 className="text-2xl leading-tight font-semibold tracking-tight text-primary sm:text-3xl">
          Create your account
        </h1>
      </header>

      <SocialAuth intent="signup" className="mt-7" />
      
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
          className="mt-2 w-full"
        >
          Create account
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

export { SignupForm }
