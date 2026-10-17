import { redirect } from "next/navigation"
import type { NextRequest } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/server"

/**
 * Landing point for every link Supabase emails out — sign-up confirmations and
 * password resets alike.
 *
 * Two shapes arrive here depending on the email template:
 *  - `?token_hash=…&type=…` when the template uses `{{ .TokenHash }}`
 *  - `?code=…` from the default `{{ .ConfirmationURL }}` template, which
 *    bounces through Supabase and hands back a PKCE code
 * Both are handled so the flow works whichever template the project uses.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const code = searchParams.get("code")
  const next = safeNext(searchParams.get("next"))

  const supabase = await createClient()

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) redirect(next)
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) redirect(next)
  }

  redirect("/login?error=link-invalid")
}

/** Only ever redirect within this site — never to a URL an email can name. */
function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/"
  return value
}
