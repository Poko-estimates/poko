import type { Metadata } from "next"

import { AuthCard } from "@/components/auth/auth-card"

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to Poko to run planning poker with your team — with email, Google or GitHub.",
}

export default function Page() {
  return <AuthCard mode="login" />
}
