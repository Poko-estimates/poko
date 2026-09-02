import type { Metadata } from "next"

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"

export const metadata: Metadata = {
  title: "Reset your password",
  description: "Send yourself a link to choose a new Poko password.",
}

export default function Page() {
  return <ForgotPasswordForm />
}
