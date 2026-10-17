import type { Metadata } from "next"

import { ResetPasswordForm } from "@/components/auth/reset-password-form"

export const metadata: Metadata = {
  title: "Choose a new password",
  description: "Set a new password for your Poko account.",
}

export default function Page() {
  return <ResetPasswordForm />
}
