import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export default async function SupabaseTestPage() {
  const cookieStore = await cookies()

  // Initialize server client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Handled in Middleware
          }
        },
      },
    }
  )

  // Query Supabase server time/health check
  const { data, error } = await supabase.from('_dummy_query').select('*').limit(1)

  // A "table not found" error means the request reached PostgREST and authenticated,
  // so it proves the API key and URL reached your Supabase instance.
  // PGRST205: table missing from the schema cache. 42P01: undefined_table.
  const tableNotFound = ['PGRST205', 'PGRST204', '42P01']
  const isConnected = !error || tableNotFound.includes(error.code ?? '')

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Supabase Connection Status</h1>
      
      {isConnected ? (
        <div style={{ color: 'green', fontWeight: 'bold' }}>
          ✅ Connected successfully to Supabase!
        </div>
      ) : (
        <div style={{ color: 'red', fontWeight: 'bold' }}>
          ❌ Connection Failed
          <pre>{JSON.stringify(error, null, 2)}</pre>
        </div>
      )}

      <h3>Environment Variables Check:</h3>
      <ul>
        <li>
          URL Configured:{' '}
          {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'YES' : 'NO (Missing)'}
        </li>
        <li>
          Publishable Key Configured:{' '}
          {process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? 'YES' : 'NO (Missing)'}
        </li>
      </ul>
    </div>
  )
}