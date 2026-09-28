import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { canAccessFinancials, isAdminOrAbove, isOwner } from "@/types/database";
import type { Profile } from "@/types/database";

// Route prefixes gated by role, checked in order — first match wins.
// /inventori, /finance and /laporan: owner/admin/manager. /team: owner/admin
// only. /finance/investor-payouts: owner only. /inspeksi is open to everyone
// signed in (mechanics do the inspecting).
const ROLE_GATES: { prefix: string; allowed: (profile: Pick<Profile, "role" | "is_owner">) => boolean }[] = [
  { prefix: "/team", allowed: isAdminOrAbove },
  // Must stay above "/finance" — first match wins.
  { prefix: "/finance/investor-payouts", allowed: isOwner },
  { prefix: "/finance", allowed: canAccessFinancials },
  { prefix: "/inventori", allowed: canAccessFinancials },
  { prefix: "/laporan", allowed: canAccessFinancials },
];

// Next.js 16 renamed the "middleware" file convention to "proxy" (same
// behavior, runs on the Node.js runtime by default now instead of Edge —
// which is what @supabase/ssr needs anyway). This runs before every
// request: it refreshes the Supabase session cookie and redirects to
// /login if there's no signed-in user trying to reach a page under the
// (app) group.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginPage = request.nextUrl.pathname.startsWith("/login");

  if (!user && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  const gate = user && ROLE_GATES.find((g) => request.nextUrl.pathname.startsWith(g.prefix));
  if (gate) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role, is_owner")
      .eq("id", user!.id)
      .single<Pick<Profile, "role" | "is_owner">>();
    if (error) console.error("proxy: role-gate profile lookup failed for user", user!.id, error);

    if (!profile || !gate.allowed(profile)) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Run on everything except static assets, image optimization files, and
    // sw.js — that last one matters: without it, the auth check redirects
    // an unauthenticated service-worker registration request to /login's
    // HTML instead of serving the actual script, and registration fails
    // silently (the browser rejects a non-JS response for a SW script).
    "/((?!_next/static|_next/image|favicon.ico|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
