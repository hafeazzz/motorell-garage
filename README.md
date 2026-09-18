# Motorell Garage

Next.js + TypeScript + Supabase starting point, following the design and
structure worked out in the prototype. This is a real, working codebase —
not a mockup — but it's a **starting point**, not a full port of every
micro-feature from the prototype. See "What's fully wired vs. simplified"
below before you start extending it.

## Setup

1. Create a Supabase project.
2. In the Supabase SQL editor, run `supabase/schema.sql` once. It creates
   every table, the monthly-target seed row, and all RLS policies.
3. Create the owner's login: Supabase dashboard → Authentication → Add
   user (email + password, confirm email = yes). Copy the generated user
   id, then insert their profile row:
   ```sql
   insert into public.profiles (id, name, role, is_owner, position, tracks_attendance)
   values ('<paste-the-auth-user-id>', 'Nayn', 'admin', true, 'Owner', false);
   ```
   Every other account (Wisnu, Rizky, Fajar, …) gets created from the
   in-app Team page once the owner is signed in — that's what the
   "Add account" form there is for.
4. Copy `.env.local.example` to `.env.local` and fill in the three
   Supabase values (Project Settings → API).
5. `npm install`
6. `npm run dev` — [http://localhost:3000](http://localhost:3000)

## Deploying

Push to GitHub, import the repo in Vercel, and add the same three env
vars from `.env.local` to the Vercel project (Settings → Environment
Variables). Vercel picks up `vercel.json`'s cron entry automatically —
just also set `CRON_SECRET` there to any random string (Vercel sends it
back as the `Authorization: Bearer <secret>` header when it calls the
route, which is what `src/app/api/cron/monthly-reset/route.ts` checks).

## What's fully wired vs. simplified

**Fully wired, real data, real auth:** login, the app shell (topbar +
role-based bottom nav), Home (greeting, stats, admin-only profit card
with monthly target, Today Task with add/edit/delete/toggle), Attendance
(self check-in, owner/no-attendance exemption, admin recap), Finance
(list, add unit, full detail/edit form including the conditional booking
deposit and date-sold fields, expense history), Report (this month's
sold units, best seller, admin-only profit %), Team (owner-only guard,
add/remove accounts, per-account position/role/attendance toggle,
rename), and the monthly-reset cron job that actually runs on a
schedule — the one thing the prototype could only fake.

**Deliberately simplified for this first pass** — same data model and
same Server Action pattern, just less polished than the prototype, so
you can extend either by following the existing pattern:
- No animations (page transitions, count-up numbers, the donut-chart
  draw-in) — the prototype's CSS keyframes in its `<style>` block are a
  reasonable copy/paste starting point once you're ready for these.
- No icons in the bottom nav or elsewhere yet — text labels only.
- Report page shows sold units as a plain list + text summary instead
  of the animated SVG donut chart.
- Report's "browse past months" selector isn't built yet — the cron job
  writes to `sold_archive`, but no page reads from it. That's the next
  natural page to add (a `?period=YYYY-MM` search param on
  `/laporan` that switches between querying `units` and `sold_archive`).
- No photo upload (unit photos, profile photos) — `photo_url` /
  `profile_photo_url` columns exist and are read if present, but there's
  no upload UI yet. Wire these to Supabase Storage when you get to it.
- CSV export isn't built yet.

## A note on the RLS policies

Two places in `supabase/schema.sql` are worth reading closely before you
add more owner-only or role-gated columns: the `profiles` table and the
`tasks` table. Both have a comment explaining why a plain "users can
update their own row" policy would have been a privilege-escalation bug
(Postgres OR-combines multiple permissive policies on the same command,
so it restricts by *row*, not by *column* — a naive policy would have
let a staff account rewrite their own `role` or `is_owner` field). The
fix in both cases is a `security definer` RPC function that only ever
touches the one column it's meant to. If you add another self-service
edit for a sensitive table, follow that same pattern rather than a
direct UPDATE policy.
