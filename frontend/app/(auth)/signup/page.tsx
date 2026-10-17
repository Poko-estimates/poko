import type { Metadata } from "next"

import { AuthCard } from "@/components/auth/auth-card"

export const metadata: Metadata = {
  title: "Create your account",
  description:
    "Create a free Poko account and run your first planning poker session in minutes.",
}

export default function Page() {
  return <AuthCard mode="signup" />
}
