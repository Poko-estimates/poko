import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import type { Database } from "@/lib/supabase/database.types"

/**
 * Routes that require a signed-in user. Everything else is public — this is a
 * marketing site with an auth flow bolted on, not an app behind a login wall.
 */
const PROTECTED_PREFIXES = ["/dashboard", "/settings", "/reset-password"]

/** Auth screens a signed-in user has no reason to see. */
const AUTH_ROUTES = ["/login", "/signup", "/forgot-password"]

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

/**
 * Refreshes the Supabase session on every request and applies the route rules
 * above. Called from `proxy.ts` (Next 16's rename of `middleware.ts`).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  // This client only ever touches `auth`, so the generic is cosmetic here —
  // threaded anyway so nobody has to wonder which of the three is typed.
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Do not run code between createServerClient and supabase.auth.getClaims().
  // A simple mistake could make it very hard to debug issues with users being
  // randomly logged out.
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims

  // An invited guest signs in anonymously, so they hold a real session and
  // carry the `authenticated` role just like a member. Treating "has a session"
  // as "is a member" gets both rules below backwards: the guest would be let
  // into /dashboard, where they'd find an empty list and a create button that
  // fails, and bounced off /login, which is the one page that could turn them
  // into a real account.
  //
  // `is_anonymous` is issued by GoTrue and is not user-editable — unlike
  // user_metadata, which is why it is safe to branch on.
  const member = Boolean(claims) && claims?.is_anonymous !== true

  const { pathname } = request.nextUrl

  if (!member && isProtected(pathname)) {
    return redirectPreservingSession(request, supabaseResponse, "/login")
  }

  if (member && AUTH_ROUTES.includes(pathname)) {
    return redirectPreservingSession(request, supabaseResponse, "/dashboard")
  }

  // IMPORTANT: return the supabaseResponse object as it is, so the refreshed
  // auth cookies reach the browser.
  return supabaseResponse
}

/**
 * Redirects while carrying over any cookies the refresh just set. Returning a
 * bare NextResponse.redirect() here would drop them and log the user out.
 */
function redirectPreservingSession(
  request: NextRequest,
  supabaseResponse: NextResponse,
  pathname: string
) {
  const url = request.nextUrl.clone()
  url.pathname = pathname
  url.search = ""

  const response = NextResponse.redirect(url)
  supabaseResponse.cookies
    .getAll()
    .forEach((cookie) => response.cookies.set(cookie))

  return response
}
