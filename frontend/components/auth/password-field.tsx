"use client"

import { useState } from "react"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

function PasswordField({
  label = "Password",
  autoComplete,
  placeholder,
  description,
  minLength,
  withForgotLink = false,
}: {
  label?: string
  autoComplete: "current-password" | "new-password"
  placeholder?: string
  description?: string
  minLength?: number
  withForgotLink?: boolean
}) {
  const [visible, setVisible] = useState(false)

  return (
    <Field name="password">
      <div className="flex items-baseline justify-between gap-3">
        <FieldLabel>{label}</FieldLabel>
        {withForgotLink && (
          <Link
            href="/forgot-password"
            className="rounded-sm text-xs font-medium text-muted-foreground underline-offset-4 transition-colors outline-none hover:text-primary hover:underline focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            Forgot password?
          </Link>
        )}
      </div>

      <div className="relative">
        <Input
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder={placeholder}
          minLength={minLength}
          required
          className="pr-11"
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-r-xl text-muted-foreground transition-colors outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          {visible ? (
            <EyeOff className="size-4" aria-hidden="true" />
          ) : (
            <Eye className="size-4" aria-hidden="true" />
          )}
        </button>
      </div>

      <FieldError match="valueMissing">Enter your password.</FieldError>
      <FieldError match="tooShort">
        Use at least {minLength} characters.
      </FieldError>
      {description && <FieldDescription>{description}</FieldDescription>}
    </Field>
  )
}

export { PasswordField }
