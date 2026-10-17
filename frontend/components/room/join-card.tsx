"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Form } from "@base-ui/react/form"
import { Spade } from "lucide-react"

import { FormAlert } from "@/components/auth/form-alert"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { joinRoom } from "@/lib/issues/actions"

/**
 * The door into a room you were invited to.
 *
 * A gate rather than an overlay: until you have a seat, row-level security
 * means there is genuinely no room data to render behind it. An overlay would
 * imply a table you can see but not touch.
 *
 * It deliberately doesn't name the issue. Naming it would require reading the
 * row before you've joined, which is an unauthenticated way to ask "does this
 * slug exist?" — and the invite slug is the capability, so that question
 * shouldn't be answerable without a session. A bad link fails on submit
 * instead.
 */
function JoinCard({
  signedIn,
  slug,
  suggestedName,
}: {
  signedIn: boolean
  slug: string
  suggestedName: string
}) {
  const [pending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)
  const [name, setName] = useState(suggestedName)

  function handleSubmit() {
    setFormError(null)

    startTransition(async () => {
      // A successful join redirects, so control only returns on failure.
      const result = await joinRoom(slug, name)
      if (result?.formError) setFormError(result.formError)
    })
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-[0_45px_90px_-45px_rgba(20,33,61,0.5)] sm:p-8">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-secondary/15 text-secondary">
        <Spade className="size-6" aria-hidden="true" />
      </span>

      <h1 className="mt-4 text-xl leading-tight font-semibold tracking-tight text-primary sm:text-2xl">
        You&apos;ve been invited to estimate
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {signedIn
          ? "Take a seat and the table will open."
          : "Pick a name your team will recognise. No account needed — you can make one later if you want to keep your issues."}
      </p>

      <Form className="mt-6 flex flex-col gap-4" onFormSubmit={handleSubmit}>
        {formError && <FormAlert>{formError}</FormAlert>}

        <Field name="displayName">
          <FieldLabel>Your name</FieldLabel>
          <Input
            value={name}
            onValueChange={setName}
            placeholder="Ama Kyei"
            autoComplete="name"
            maxLength={60}
            required
          />
          <FieldError match="valueMissing">
            Your team needs to know which card is yours.
          </FieldError>
        </Field>

        <Button
          type="submit"
          variant="secondary"
          size="xl"
          disabled={pending}
          className="mt-1 w-full"
        >
          {pending
            ? "Taking your seat…"
            : signedIn && suggestedName
              ? `Join as ${suggestedName}`
              : "Join the room"}
        </Button>
      </Form>

      {!signedIn && (
        <p className="mt-5 text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>{" "}
          first, then reopen this link.
        </p>
      )}
    </div>
  )
}

export { JoinCard }
