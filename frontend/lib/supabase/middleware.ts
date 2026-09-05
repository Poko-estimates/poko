import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

/**
 * Routes that require a signed-in user. Everything else is public — this is a
 * marketing site with an auth flow bolted on, not an app behind a login wall.
 */
const PROTECTED_PREFIXES = ["/dashboard", "/reset-password"]

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
  const supabase = createServerClient(
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
  const user = data?.claims

  const { pathname } = request.nextUrl

  if (!user && isProtected(pathname)) {
    return redirectPreservingSession(request, supabaseResponse, "/login")
  }

  if (user && AUTH_ROUTES.includes(pathname)) {
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
