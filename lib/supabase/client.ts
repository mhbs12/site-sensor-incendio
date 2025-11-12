import { createBrowserClient } from "@supabase/ssr"

let client: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseBrowserClient(customUrl?: string, customAnonKey?: string) {
  // If custom credentials are provided, create a new client
  if (customUrl && customAnonKey) {
    return createBrowserClient(customUrl, customAnonKey)
  }

  // Otherwise use the singleton pattern with env variables
  if (client) {
    return client
  }

  client = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

  return client
}
