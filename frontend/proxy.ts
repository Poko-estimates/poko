import type { NextRequest } from "next/server"

import { updateSession } from "@/lib/supabase/middleware"

/**
 * Next 16 renamed the `middleware` file convention to `proxy`. This keeps the
 * Supabase session fresh on every request that renders a page.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Everything except Next internals and static assets — the session only
     * needs refreshing on requests that render a page.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)",
  ],
}
