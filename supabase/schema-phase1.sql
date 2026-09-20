-- ============================================================
-- Motorell Garage — Phase 1 migration (Auth + Role System)
-- Run this once in the Supabase SQL editor, AFTER schema.sql.
-- Adds 'owner' and 'manager' as valid values for profiles.role.
-- ============================================================

-- 1. Widen the role check constraint from ('admin','staff') to all four tiers.
alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('owner', 'admin', 'manager', 'staff'));

-- 2. Give the existing owner row role = 'owner' explicitly, so the app-level
--    Role type and the is_owner flag agree. (is_owner stays — the
--    "one_owner_only" unique index and existing RLS functions key off it.)
update public.profiles set role = 'owner' where is_owner = true;

-- 3. is_admin() currently only matches role = 'admin'. Widen it to also
--    match 'owner', so admin-gated policies (tasks, sold_archive) keep
--    working for the owner account without relying on is_owner() there too.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('owner', 'admin')
  );
$$;

-- 4. New helper: owner, admin, or manager — used for financial-data RLS
--    once units/unit_expenses/sold_archive policies are tightened (Phase 2).
--    Not wired into any policy yet — /keuangan and /laporan stay open to
--    any signed-in account at the DB layer for now; the proxy-level route
--    guard added in this phase is what actually restricts page access.
create or replace function public.is_manager_or_above()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('owner', 'admin', 'manager')
  );
$$;
