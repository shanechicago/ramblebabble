import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only admin client (uses the secret key). NEVER import this into a
// client component. Used to create accounts without an email-confirmation step.
export function getAdmin(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
