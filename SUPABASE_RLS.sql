-- Backend hardening script for Supabase.
-- Run this in Supabase SQL Editor.
-- It is idempotent and safe to re-run.

create extension if not exists pgcrypto;

-- =========================
-- Core tables
-- =========================
create table if not exists public.hardware_assets (
  id uuid primary key default gen_random_uuid(),
  asset_id text not null,
  device_name text not null,
  device_type text not null,
  serial_number text,
  purchase_date date,
  warranty_expiry date,
  assigned_to text,
  lifecycle_status text not null default 'Active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  constraint hardware_assets_lifecycle_status_check
    check (lifecycle_status in ('New', 'Active', 'Under Maintenance', 'Retired', 'Disposed'))
);

create table if not exists public.maintenance_logs (
  id uuid primary key default gen_random_uuid(),
  hardware_id uuid not null references public.hardware_assets(id) on delete cascade,
  maintenance_date date not null,
  issue_description text not null,
  action_taken text,
  technician_name text,
  maintenance_status text not null default 'Open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  constraint maintenance_logs_status_check
    check (maintenance_status in ('Open', 'In Progress', 'Resolved'))
);

create table if not exists public.lifecycle_history (
  id uuid primary key default gen_random_uuid(),
  hardware_id uuid not null references public.hardware_assets(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_by text,
  changed_at timestamptz not null default now(),
  created_by uuid,
  constraint lifecycle_history_new_status_check
    check (new_status in ('New', 'Active', 'Under Maintenance', 'Retired', 'Disposed'))
);

-- Ensure key columns exist for earlier table versions.
alter table public.hardware_assets add column if not exists created_at timestamptz not null default now();
alter table public.hardware_assets add column if not exists updated_at timestamptz not null default now();
alter table public.hardware_assets add column if not exists created_by uuid;

alter table public.maintenance_logs add column if not exists created_at timestamptz not null default now();
alter table public.maintenance_logs add column if not exists updated_at timestamptz not null default now();
alter table public.maintenance_logs add column if not exists created_by uuid;

alter table public.lifecycle_history add column if not exists changed_at timestamptz not null default now();
alter table public.lifecycle_history add column if not exists created_by uuid;

-- Strong data constraints/indexes
create unique index if not exists hardware_assets_asset_id_unique_idx
  on public.hardware_assets (asset_id);

create unique index if not exists hardware_assets_serial_number_unique_idx
  on public.hardware_assets (serial_number)
  where serial_number is not null;

create index if not exists hardware_assets_lifecycle_status_idx
  on public.hardware_assets (lifecycle_status);

create index if not exists hardware_assets_warranty_expiry_idx
  on public.hardware_assets (warranty_expiry);

create index if not exists maintenance_logs_hardware_id_idx
  on public.maintenance_logs (hardware_id);

create index if not exists maintenance_logs_maintenance_date_idx
  on public.maintenance_logs (maintenance_date desc);

create index if not exists lifecycle_history_hardware_id_idx
  on public.lifecycle_history (hardware_id);

create index if not exists lifecycle_history_changed_at_idx
  on public.lifecycle_history (changed_at desc);

-- Explicit grants for authenticated clients.
grant usage on schema public to authenticated;
grant select on public.hardware_assets to authenticated;
grant select on public.maintenance_logs to authenticated;
grant select on public.lifecycle_history to authenticated;
grant insert, update, delete on public.hardware_assets to authenticated;
grant insert, update, delete on public.maintenance_logs to authenticated;
grant insert, update, delete on public.lifecycle_history to authenticated;

-- Automatic updated_at maintenance.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.set_created_by()
returns trigger
language plpgsql
as $$
begin
  if new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_hardware_assets_set_updated_at on public.hardware_assets;
create trigger trg_hardware_assets_set_updated_at
before update on public.hardware_assets
for each row execute function public.set_updated_at();

drop trigger if exists trg_maintenance_logs_set_updated_at on public.maintenance_logs;
create trigger trg_maintenance_logs_set_updated_at
before update on public.maintenance_logs
for each row execute function public.set_updated_at();

drop trigger if exists trg_hardware_assets_set_created_by on public.hardware_assets;
create trigger trg_hardware_assets_set_created_by
before insert on public.hardware_assets
for each row execute function public.set_created_by();

drop trigger if exists trg_maintenance_logs_set_created_by on public.maintenance_logs;
create trigger trg_maintenance_logs_set_created_by
before insert on public.maintenance_logs
for each row execute function public.set_created_by();

drop trigger if exists trg_lifecycle_history_set_created_by on public.lifecycle_history;
create trigger trg_lifecycle_history_set_created_by
before insert on public.lifecycle_history
for each row execute function public.set_created_by();

-- =========================
-- Row-level security
-- =========================
alter table public.hardware_assets enable row level security;
alter table public.maintenance_logs enable row level security;
alter table public.lifecycle_history enable row level security;

-- Helper role check. Reads app_metadata.role from JWT.
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

-- Kept for backward compatibility with older policy versions.
create or replace function public.is_technician()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'technician', false);
$$;

-- Remove old policies so names are deterministic.
drop policy if exists hardware_assets_select_auth on public.hardware_assets;
drop policy if exists hardware_assets_insert_auth on public.hardware_assets;
drop policy if exists hardware_assets_update_auth on public.hardware_assets;
drop policy if exists hardware_assets_delete_auth on public.hardware_assets;

drop policy if exists maintenance_logs_select_auth on public.maintenance_logs;
drop policy if exists maintenance_logs_insert_auth on public.maintenance_logs;
drop policy if exists maintenance_logs_update_auth on public.maintenance_logs;
drop policy if exists maintenance_logs_delete_auth on public.maintenance_logs;

drop policy if exists lifecycle_history_select_auth on public.lifecycle_history;
drop policy if exists lifecycle_history_insert_auth on public.lifecycle_history;
drop policy if exists lifecycle_history_update_auth on public.lifecycle_history;
drop policy if exists lifecycle_history_delete_auth on public.lifecycle_history;

-- Hardware policies
create policy hardware_assets_select_auth
on public.hardware_assets
for select
to authenticated
using (true);

create policy hardware_assets_insert_auth
on public.hardware_assets
for insert
to authenticated
with check (public.is_admin());

create policy hardware_assets_update_auth
on public.hardware_assets
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy hardware_assets_delete_auth
on public.hardware_assets
for delete
to authenticated
using (public.is_admin());

-- Maintenance policies
create policy maintenance_logs_select_auth
on public.maintenance_logs
for select
to authenticated
using (true);

create policy maintenance_logs_insert_auth
on public.maintenance_logs
for insert
to authenticated
with check (public.is_admin());

create policy maintenance_logs_update_auth
on public.maintenance_logs
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy maintenance_logs_delete_auth
on public.maintenance_logs
for delete
to authenticated
using (public.is_admin());

-- Lifecycle policies
create policy lifecycle_history_select_auth
on public.lifecycle_history
for select
to authenticated
using (true);

create policy lifecycle_history_insert_auth
on public.lifecycle_history
for insert
to authenticated
with check (public.is_admin());

create policy lifecycle_history_update_auth
on public.lifecycle_history
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy lifecycle_history_delete_auth
on public.lifecycle_history
for delete
to authenticated
using (public.is_admin());
