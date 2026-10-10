-- ============================================================
-- Motorell Garage — Phase 4 migration (idempotent unit creation).
-- Run once in the Supabase SQL editor.
--
-- A double submit (double-tap, slow network + retry) of the "Add unit"
-- form must not create two units. The client generates one UUID per form
-- mount and sends it as client_token; the unique index below turns a
-- repeat submit into a 23505 (unique_violation) that the server action
-- catches and resolves back to the already-created unit's id instead of
-- inserting again.
-- ============================================================

alter table public.units
  add column if not exists client_token text;

create unique index if not exists units_client_token_idx
  on public.units (client_token);
