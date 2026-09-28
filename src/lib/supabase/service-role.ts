import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// SERVICE ROLE client — bypasses Row Level Security entirely.
// Server-only: import it from Route Handlers and Server Actions, never from
// a Client Component, and only AFTER the caller has been authorized (the
// cron route checks CRON_SECRET; team and inspeksi actions check the
// signed-in user's role/ownership first). SUPABASE_SERVICE_ROLE_KEY must stay
// a server-only env var (no NEXT_PUBLIC_ prefix).
export function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
