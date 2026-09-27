-- ============================================================
-- Motorell Garage — Phase 2 migration (Inventory edit/delete RLS)
-- Run this once in the Supabase SQL editor, AFTER schema.sql and
-- schema-phase1.sql.
--
-- units currently has ONE write policy, from schema.sql:
--   create policy "units writable by any signed-in account"
--     on public.units for all using (auth.uid() is not null) ...
-- That's FOR ALL (insert/update/delete) granted to any signed-in
-- account — staff included. This migration drops it and replaces it
-- with three narrower policies restricted to owner/admin, matching
-- the app-layer requireAdmin() guard now added to createUnit/
-- updateUnit/deleteUnit in inventori/actions.ts. The existing SELECT
-- policy ("units readable by any signed-in account") is untouched —
-- manager/staff keep read access, matching Phase 1's
-- canAccessFinancials().
--
-- Uses is_admin() from schema-phase1.sql, which already means
-- "owner or admin" — no new SQL function needed.
-- ============================================================

drop policy if exists "units writable by any signed-in account" on public.units;

create policy "units insert by owner or admin"
  on public.units for insert
  with check (public.is_admin());

create policy "units update by owner or admin"
  on public.units for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "units delete by owner or admin"
  on public.units for delete
  using (public.is_admin());
