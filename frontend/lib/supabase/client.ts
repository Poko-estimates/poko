import { createBrowserClient } from '@supabase/ssr'

import type { Database } from '@/lib/supabase/database.types'

/**
 * Browser-side client. `createBrowserClient` returns a singleton per origin, so
 * calling this repeatedly — including inside an effect — reuses one connection
 * rather than opening a second websocket.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
