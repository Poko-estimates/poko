"use client"

import { useState, useTransition } from "react"
import { Form } from "@base-ui/react/form"

import { FormAlert } from "@/components/auth/form-alert"
import { PasswordField } from "@/components/auth/password-field"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { changePassword } from "@/lib/account/actions"

function PasswordForm() {
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)
  // Bumped after a save to clear the field, which is simpler and safer than
  // controlling a password input's value.
  const [formKey, setFormKey] = useState(0)

  function handleSubmit(values: Record<string, unknown>) {
    setFormError(null)

    startTransition(async () => {
      const result = await changePassword(String(values.password ?? ""))

      if (result.formError) {
        setFormError(result.formError)
        return
      }

      toast.add({ type: "success", title: "Password changed" })
      setFormKey((current) => current + 1)
    })
  }

  return (
    <Form
      key={formKey}
      className="flex flex-col gap-4"
      onFormSubmit={handleSubmit}
    >
      {formError && <FormAlert>{formError}</FormAlert>}

      <PasswordField
        label="New password"
        autoComplete="new-password"
        placeholder="••••••••"
        minLength={8}
        description="At least 8 characters. You'll stay signed in."
      />

      <div className="flex justify-end">
        <Button type="submit" variant="outline" size="lg" disabled={pending}>
          {pending ? "Changing…" : "Change password"}
        </Button>
      </div>
    </Form>
  )
}

export { PasswordForm }
