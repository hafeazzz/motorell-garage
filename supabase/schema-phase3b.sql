-- ============================================================
-- Motorell Garage — Phase 3B migration (inspection realtime, audit
-- history, soft delete). Run once in the Supabase SQL editor, AFTER
-- schema-phase3.sql.
--
-- What is deliberately NOT here:
--  * No new read policies — inspections / inspection_items are already
--    readable by every signed-in account (schema-phase3.sql), so all
--    staff can already watch. What was missing for "live" is below:
--    adding the tables to the realtime publication.
--  * No looser write policies on inspection_items. Mechanics create
--    their own rows on the first tap of an item, so making INSERT
--    admin-only would stop them filling in a checklist at all.
--  * No decision/purchase_price columns — status + harga_beli already
--    carry that (draft -> selesai -> beli | tidak; harga_beli is now
--    filled in at decision time instead of when the inspection starts).
-- ============================================================

-- ---------- Soft delete ----------
-- Deleted inspections are hidden by the app (is_deleted = false filter)
-- rather than by the SELECT policy: hiding rows in the policy makes the
-- UPDATE that sets is_deleted fail RLS when the new row can't be read.
alter table public.inspections
  add column if not exists is_deleted boolean not null default false;
create index if not exists inspections_is_deleted_idx on public.inspections (is_deleted);

-- ---------- Audit history ----------
-- Append-only. Clients get SELECT only; every write comes from a server
-- action using the service role, so entries can't be forged or edited
-- from the browser. inspection_id is SET NULL (not CASCADE) with a name
-- snapshot so the log outlives even a hard delete.
create table public.inspection_history (
  id bigint generated always as identity primary key,
  inspection_id bigint references public.inspections (id) on delete set null,
  inspection_nama text not null,
  action text not null check (action in ('created', 'completed', 'decided', 'deleted')),
  decided_action text check (decided_action in ('beli', 'tidak')),
  actor_id uuid references public.profiles (id) on delete set null,
  actor_name text,
  notes text,
  created_at timestamptz not null default now()
);
create index inspection_history_inspection_idx on public.inspection_history (inspection_id, created_at);

alter table public.inspection_history enable row level security;
create policy "inspection_history readable by any signed-in account"
  on public.inspection_history for select using (auth.uid() is not null);

-- ---------- Realtime ----------
-- SELECT policies alone don't make a table live: it also has to be in the
-- supabase_realtime publication. Realtime applies each subscriber's RLS,
-- so this exposes nothing beyond what they can already read.
do $$
declare
  t text;
begin
  foreach t in array array['inspections', 'inspection_items', 'inspection_history'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
