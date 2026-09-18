import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// SERVICE ROLE client — bypasses Row Level Security entirely.
// Only ever import this inside a Route Handler that itself checks
// CRON_SECRET (see src/app/api/cron/monthly-reset/route.ts). Never
// import this into a Client Component or anything the browser can
// reach — SUPABASE_SERVICE_ROLE_KEY must stay a server-only env var
// (no NEXT_PUBLIC_ prefix).
export function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
