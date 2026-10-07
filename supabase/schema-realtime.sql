-- Realtime for the client data store (src/lib/store.tsx).
-- Run once in the Supabase SQL editor. Safe to run again.
--
-- The app now loads its data once and keeps it fresh from Realtime, like
-- Motorell Ops. A table only sends live changes if it is in the
-- supabase_realtime publication; without this, another phone's changes
-- show up only when the app is reopened / brought back to the foreground.
-- Realtime applies each subscriber's RLS, so this exposes nothing beyond
-- what they can already read.
do $$
declare
  t text;
begin
  foreach t in array array['units', 'unit_expenses', 'tasks', 'attendance', 'profiles', 'settings',
                           'inspections', 'inspection_items', 'inspection_history'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
