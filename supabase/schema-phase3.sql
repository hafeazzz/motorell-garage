-- ============================================================
-- Motorell Garage — Phase 3 migration (Inspections + Investors)
-- Run once in the Supabase SQL editor, AFTER schema.sql,
-- schema-phase1.sql and schema-phase2-inventori.sql.
--
-- Differences from a naive port, on purpose:
--  * ids are bigint identity (units.id is bigint here, so a uuid
--    unit_id FK would fail), timestamps are timestamptz.
--  * investor_payouts.unit_id is ON DELETE SET NULL with a snapshot of
--    the unit's name/plate: the monthly cron DELETES archived sold
--    units, and a CASCADE would wipe unpaid payouts on the 1st.
--  * inspector FK is ON DELETE SET NULL so removing a team account
--    isn't blocked by their old inspections.
--  * inspection_items gets real policies (RLS with no policy = no access).
-- ============================================================

-- ---------- Inspections (pre-purchase, modelled on MotorellOps) ----------
-- status: draft (in progress) -> selesai (inspector finished) ->
--         beli (bought; unit_id set) | tidak (passed on)
create table public.inspections (
  id bigint generated always as identity primary key,
  inspector_id uuid references public.profiles (id) on delete set null,
  nama text not null,
  tahun int,
  plat text,
  harga_beli numeric,
  notes text,
  status text not null default 'draft' check (status in ('draft', 'selesai', 'beli', 'tidak')),
  unit_id bigint references public.units (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index inspections_status_idx on public.inspections (status);

-- One row per checked item; status is null when only a photo was added.
create table public.inspection_items (
  id bigint generated always as identity primary key,
  inspection_id bigint not null references public.inspections (id) on delete cascade,
  section text not null,
  item_name text not null,
  status text check (status in ('baik', 'perhatian', 'masalah')),
  photo_url text,
  checked_at timestamptz not null default now(),
  unique (inspection_id, section, item_name)
);

-- ---------- Investors (simplified; profit-based like MotorellOps) ----------
create table public.unit_investors (
  id bigint generated always as identity primary key,
  unit_id bigint not null references public.units (id) on delete cascade,
  investor_name text not null,
  share_percentage numeric not null check (share_percentage > 0 and share_percentage <= 100),
  created_at timestamptz not null default now(),
  unique (unit_id, investor_name)
);

-- payout = share% of net PROFIT, zero on a loss (MotorellOps: "motor rugi
-- tidak dipotong investor"). profit and payout_amount are generated so they
-- can never drift from sale_price / modal_total / share_percentage.
create table public.investor_payouts (
  id bigint generated always as identity primary key,
  unit_id bigint references public.units (id) on delete set null,
  unit_nama text not null,
  unit_plat text,
  investor_name text not null,
  share_percentage numeric not null,
  sale_price numeric not null,
  modal_total numeric not null,
  profit numeric generated always as (sale_price - modal_total) stored,
  payout_amount numeric generated always as (round(greatest(sale_price - modal_total, 0) * share_percentage / 100)) stored,
  status text not null default 'pending' check (status in ('pending', 'paid')),
  payment_date timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  unique (unit_id, investor_name)
);
create index investor_payouts_status_idx on public.investor_payouts (status);

-- ---------- Row Level Security ----------
alter table public.inspections enable row level security;
alter table public.inspection_items enable row level security;
alter table public.unit_investors enable row level security;
alter table public.investor_payouts enable row level security;

-- Anyone signed in can read inspections and start their own.
create policy "inspections readable by any signed-in account"
  on public.inspections for select using (auth.uid() is not null);
create policy "inspections insert own"
  on public.inspections for insert
  with check (auth.uid() is not null and inspector_id = auth.uid());
-- Inspector may edit while draft and may move it to 'selesai'; only
-- owner/admin can decide (beli/tidak) or edit afterwards.
create policy "inspections update"
  on public.inspections for update
  using (public.is_admin() or (inspector_id = auth.uid() and status = 'draft'))
  with check (public.is_admin() or (inspector_id = auth.uid() and status in ('draft', 'selesai')));
create policy "inspections delete by owner or admin"
  on public.inspections for delete using (public.is_admin());

create policy "inspection_items readable by any signed-in account"
  on public.inspection_items for select using (auth.uid() is not null);
create policy "inspection_items write by inspector while draft, or admin"
  on public.inspection_items for all
  using (exists (
    select 1 from public.inspections i
    where i.id = inspection_id
      and (public.is_admin() or (i.inspector_id = auth.uid() and i.status = 'draft'))
  ))
  with check (exists (
    select 1 from public.inspections i
    where i.id = inspection_id
      and (public.is_admin() or (i.inspector_id = auth.uid() and i.status = 'draft'))
  ));

-- Investor data: owner/admin only at the DB layer. The app narrows viewing
-- payouts and marking them paid to the owner (see finance/actions.ts).
create policy "unit_investors owner or admin"
  on public.unit_investors for all using (public.is_admin()) with check (public.is_admin());
create policy "investor_payouts owner or admin"
  on public.investor_payouts for all using (public.is_admin()) with check (public.is_admin());
