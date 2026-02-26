 import { createBrowserClient } from '@supabase/ssr'

// 1. Create a variable to store the singleton instance
let client: ReturnType<typeof createBrowserClient> | undefined;

export const createClient = () => {
  // 2. If client already exists, return it (Singleton)
  if (client) {
    return client;
  }

  // 3. Otherwise, create a new one
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return client;
}