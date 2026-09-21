"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Form } from "@base-ui/react/form"
import { CheckCircle2, Send } from "lucide-react"

import { FormAlert } from "@/components/auth/form-alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { sendMessage } from "@/lib/contact/actions"
import {
  maxEmailLength,
  maxMessageLength,
  maxNameLength,
} from "@/lib/contact/limits"


function ContactForm({
  defaultEmail = "",
  defaultName = "",
}: {
  defaultEmail?: string
  defaultName?: string
}) {
  const [pending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const [name, setName] = useState(defaultName)
  const [email, setEmail] = useState(defaultEmail)
  const [message, setMessage] = useState("")
  const [agreed, setAgreed] = useState(false)

  // Checked on submit rather than by disabling the button. A button that does
  // nothing tells you only that something is wrong, not what — and the
  // something here is one tick box that is easy to scroll past.
  const [agreeError, setAgreeError] = useState(false)

  const left = maxMessageLength - message.trim().length

  function handleSubmit() {
    setFormError(null)
    setAgreeError(false)

    if (!agreed) {
      setAgreeError(true)
      return
    }

    startTransition(async () => {
      const result = await sendMessage({
        name: name.trim() || null,
        email: email.trim(),
        message: message.trim(),
        agreedToPrivacy: agreed,
      })

      if (result.formError) {
        setFormError(result.formError)
        return
      }

      setSent(true)
    })
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center rounded-3xl border border-border bg-card p-8 text-center shadow-[0_45px_90px_-45px_rgba(20,33,61,0.5)] sm:p-10">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-success/12 text-success">
          <CheckCircle2 className="size-7" aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-xl font-semibold tracking-tight text-primary">
          Message sent
        </h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Thanks — it landed. If it needs a reply, we&apos;ll come back to you
          at{" "}
          <span className="font-medium text-primary">{email.trim()}</span>.
        </p>

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="mt-7"
          onClick={() => {
            setSent(false)
            setMessage("")
            setAgreed(false)
          }}
        >
          Send another
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-[0_45px_90px_-45px_rgba(20,33,61,0.5)] sm:p-8">
      <Form className="flex flex-col gap-5" onFormSubmit={handleSubmit}>
        {formError && <FormAlert>{formError}</FormAlert>}

        <Field name="name">
          <FieldLabel>
            Name{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </FieldLabel>
          <Input
            value={name}
            onValueChange={setName}
            placeholder="Jane Doe"
            autoComplete="name"
            maxLength={maxNameLength}
          />
        </Field>

        <Field name="email">
          <FieldLabel>Email</FieldLabel>
          <Input
            type="email"
            value={email}
            onValueChange={setEmail}
            placeholder="you@company.com"
            autoComplete="email"
            maxLength={maxEmailLength}
            required
          />
          <FieldError match="valueMissing">
            We need somewhere to reply to.
          </FieldError>
          <FieldError match="typeMismatch">
            That doesn&apos;t look like an email address.
          </FieldError>
        </Field>

        <Field name="message">
          <FieldLabel>Message</FieldLabel>
          <Textarea
            value={message}
            onValueChange={setMessage}
            placeholder="What's working, what isn't, or what you'd change."
            maxLength={maxMessageLength}
            rows={7}
            required
          />
          <div className="flex items-start justify-between gap-3">
            <FieldError match="valueMissing">
              Tell us what&apos;s on your mind.
            </FieldError>
            <FieldDescription className="ml-auto shrink-0 tabular-nums">
              {left.toLocaleString()} left
            </FieldDescription>
          </div>
        </Field>

        {/* The label wraps the checkbox, so the text is part of the hit area —
            a 20px box is a small target for the one control that gates the
            whole form. */}
        <div className="flex flex-col gap-2">
          <label className="flex cursor-pointer items-start gap-3">
            <Checkbox
              checked={agreed}
              onCheckedChange={(next) => {
                setAgreed(next)
                if (next) setAgreeError(false)
              }}
              aria-describedby={agreeError ? agreeErrorId : undefined}
              className="mt-0.5"
            />
            <span className="text-sm leading-relaxed text-muted-foreground">
              I agree to the{" "}
              <Link
                href="/privacy"
                className="font-medium text-primary underline underline-offset-4 transition-colors hover:text-secondary"
              >
                privacy policy
              </Link>{" "}
              and to Poko storing this message so it can reply.
            </span>
          </label>

          {agreeError && (
            <p
              id={agreeErrorId}
              role="alert"
              className="text-xs font-medium text-destructive"
            >
              Please confirm you agree to the privacy policy.
            </p>
          )}
        </div>

        <Button
          type="submit"
          variant="secondary"
          size="xl"
          disabled={pending}
          className="mt-1 w-full"
        >
          <Send className="size-4" aria-hidden="true" />
          {pending ? "Sending…" : "Send message"}
        </Button>
      </Form>
    </div>
  )
}

const agreeErrorId = "contact-privacy-error"

export { ContactForm }
