-- ============================================================
-- Motorell Garage — Supabase schema
-- Run this once in the Supabase SQL editor on a fresh project.
-- ============================================================

-- ---------- profiles (one row per login account) ----------
-- id matches auth.users.id — create the auth user first (Supabase
-- dashboard → Authentication → Add user, or your own invite flow),
-- then insert the matching profile row.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  role text not null check (role in ('admin', 'staff')),
  is_owner boolean not null default false,
  position text not null default 'Mechanic',
  tracks_attendance boolean not null default true,
  profile_photo_url text,
  created_at timestamptz not null default now()
);

-- Only one owner should ever exist. This partial unique index enforces it.
create unique index one_owner_only on public.profiles (is_owner) where (is_owner = true);

-- ---------- units (garage inventory) ----------
create table public.units (
  id bigint generated always as identity primary key,
  nama text not null,
  tahun int not null,
  odometer text,
  plat text not null,
  status text not null default 'progress' check (status in ('progress', 'ready', 'booked', 'sold')),
  modal_beli numeric not null default 0,
  tgl_masuk date not null default current_date,
  photo_url text,
  harga_jual numeric,
  finance_code text,
  booking_nominal numeric,
  tanggal_jual date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index units_status_idx on public.units (status);

-- ---------- unit_expenses (repair/prep costs per unit) ----------
create table public.unit_expenses (
  id bigint generated always as identity primary key,
  unit_id bigint not null references public.units (id) on delete cascade,
  keterangan text not null,
  nominal numeric not null,
  tanggal date not null default current_date,
  created_at timestamptz not null default now()
);

create index unit_expenses_unit_id_idx on public.unit_expenses (unit_id);

-- ---------- attendance (one row per person per day) ----------
create table public.attendance (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  date date not null default current_date,
  status text not null check (status in ('masuk', 'tidak')),
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

-- ---------- tasks (Today Task on the home page) ----------
create table public.tasks (
  id bigint generated always as identity primary key,
  name text not null,
  assignee text,
  status text not null default 'pending' check (status in ('pending', 'progress', 'done')),
  created_at timestamptz not null default now()
);

-- ---------- settings (key/value store — e.g. monthly profit target) ----------
create table public.settings (
  key text primary key,
  value jsonb not null
);

insert into public.settings (key, value) values ('monthly_target', '25000000');

-- ---------- sold_archive (past months, written by the reset cron job) ----------
create table public.sold_archive (
  id bigint generated always as identity primary key,
  period text not null, -- 'YYYY-MM'
  nama text not null,
  tahun int,
  plat text,
  modal_beli numeric,
  harga_jual numeric,
  total_expenses numeric,
  tanggal_jual date,
  archived_at timestamptz not null default now()
);

create index sold_archive_period_idx on public.sold_archive (period);

-- ============================================================
-- Row Level Security
-- Every table is only readable/writable by signed-in accounts
-- (there is no public/anonymous access anywhere in this app).
-- ============================================================

alter table public.profiles enable row level security;
alter table public.units enable row level security;
alter table public.unit_expenses enable row level security;
alter table public.attendance enable row level security;
alter table public.tasks enable row level security;
alter table public.settings enable row level security;
alter table public.sold_archive enable row level security;

-- Helper: is the currently-authenticated user the owner or an admin?
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_owner()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_owner = true
  );
$$;

-- profiles: everyone signed in can read the roster (needed for Team,
-- attendance recap, task assignees); only the owner can write directly
-- to this table (role/position/tracks_attendance/add/remove accounts).
-- A plain "user can update their own row" policy would OR-combine with
-- the owner policy above and let a staff account rewrite ANY column of
-- their own row — including role and is_owner — since RLS restricts by
-- row, not by column. Renaming yourself goes through the rename_self()
-- function below instead, which only ever touches the name column.
create policy "profiles are readable by any signed-in account"
  on public.profiles for select
  using (auth.uid() is not null);

create policy "owner manages all profiles"
  on public.profiles for all
  using (public.is_owner())
  with check (public.is_owner());

create or replace function public.rename_self(new_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  if length(trim(new_name)) = 0 then
    raise exception 'name cannot be empty';
  end if;
  update public.profiles set name = trim(new_name) where id = auth.uid();
end;
$$;

grant execute on function public.rename_self(text) to authenticated;

-- units / unit_expenses: any signed-in account can read and write.
-- Tighten this later (e.g. staff read-only) once real usage patterns
-- are clearer — see the note in README.md.
create policy "units readable by any signed-in account"
  on public.units for select using (auth.uid() is not null);
create policy "units writable by any signed-in account"
  on public.units for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "unit_expenses readable by any signed-in account"
  on public.unit_expenses for select using (auth.uid() is not null);
create policy "unit_expenses writable by any signed-in account"
  on public.unit_expenses for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- attendance: everyone can read (admin-only visibility of the recap is
-- enforced in the UI); a person can only insert/update their own row.
create policy "attendance readable by any signed-in account"
  on public.attendance for select using (auth.uid() is not null);
create policy "a user manages only their own attendance row"
  on public.attendance for insert with check (auth.uid() = user_id);
create policy "a user updates only their own attendance row"
  on public.attendance for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- tasks: everyone can read; only admins can add/edit(name)/remove.
-- Staff still need to tick the checkbox, so status changes go through
-- the toggle_task_status() function below instead of a direct UPDATE
-- policy — Postgres OR-combines multiple permissive policies on the
-- same command, so a second, looser UPDATE policy here would end up
-- letting anyone edit the name/assignee too.
create policy "tasks readable by any signed-in account"
  on public.tasks for select using (auth.uid() is not null);
create policy "only admins manage tasks"
  on public.tasks for insert with check (public.is_admin());
create policy "only admins update tasks"
  on public.tasks for update using (public.is_admin()) with check (public.is_admin());
create policy "only admins delete tasks"
  on public.tasks for delete using (public.is_admin());

-- Lets any signed-in account (not just admins) flip a task's status —
-- e.g. checking it off — without being able to touch its name/assignee.
create or replace function public.toggle_task_status(task_id bigint, new_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if new_status not in ('pending', 'progress', 'done') then
    raise exception 'invalid status: %', new_status;
  end if;
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  update public.tasks set status = new_status where id = task_id;
end;
$$;

grant execute on function public.toggle_task_status(bigint, text) to authenticated;

-- settings: everyone can read; only the owner can change the monthly target.
create policy "settings readable by any signed-in account"
  on public.settings for select using (auth.uid() is not null);
create policy "only owner changes settings"
  on public.settings for update using (public.is_owner()) with check (public.is_owner());

-- sold_archive: admins only (this is financial history).
create policy "admins read sold_archive"
  on public.sold_archive for select using (public.is_admin());
