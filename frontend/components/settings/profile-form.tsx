"use client"

import { useState, useTransition } from "react"
import { Form } from "@base-ui/react/form"

import { FormAlert } from "@/components/auth/form-alert"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toast"
import { updateDisplayName } from "@/lib/account/actions"

/** Changing the name that appears in the header, the greeting and every seat. */
function ProfileForm({
  email,
  initialName,
}: {
  email: string | null
  initialName: string
}) {
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)
  const [name, setName] = useState(initialName)

  const unchanged = name.trim() === initialName.trim()

  function handleSubmit() {
    setFormError(null)

    startTransition(async () => {
      const result = await updateDisplayName(name)

      if (result.formError) {
        setFormError(result.formError)
        return
      }

      toast.add({ type: "success", title: "Name updated" })
    })
  }

  return (
    <Form className="flex flex-col gap-4" onFormSubmit={handleSubmit}>
      {formError && <FormAlert>{formError}</FormAlert>}

      <Field name="displayName">
        <FieldLabel>Display name</FieldLabel>
        <Input
          value={name}
          onValueChange={setName}
          placeholder="Ama Kyei"
          autoComplete="name"
          maxLength={60}
          required
        />
        <FieldDescription>
          What your team sees on your seat at the table.
        </FieldDescription>
        <FieldError match="valueMissing">
          Your team needs something to call you.
        </FieldError>
      </Field>

      <Field name="email">
        <FieldLabel>Email</FieldLabel>
        <Input value={email ?? ""} readOnly disabled />
        <FieldDescription>
          Changing your email needs a confirmation link, which isn&apos;t wired
          up yet.
        </FieldDescription>
      </Field>

      <div className="flex justify-end">
        <Button
          type="submit"
          variant="secondary"
          size="lg"
          disabled={pending || unchanged}
        >
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </Form>
  )
}

export { ProfileForm }
