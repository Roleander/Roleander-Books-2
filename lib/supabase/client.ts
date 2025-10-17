import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export function createClient() {
  // Use demo credentials for testing when real ones aren't available
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://demo.supabase.co'
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'demo_key_for_testing'

  return createSupabaseClient(supabaseUrl, supabaseKey)
}
