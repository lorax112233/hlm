-- Migration: replace technicians table + name-string matching with profiles + UUID linking
-- Safe to re-run (idempotent).

-- =========================
-- 1. profiles table
-- =========================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  role text not null default 'technician',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check check (role in ('admin', 'technician'))
);

drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- =========================
-- 2. Auto-sync triggers on auth.users
-- =========================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.email, ''),
    coalesce(new.raw_app_meta_data->>'role', 'technician')
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    role = excluded.role;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_update_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles set
    full_name = coalesce(new.raw_user_meta_data->>'full_name', ''),
    email = coalesce(new.email, ''),
    role = coalesce(new.raw_app_meta_data->>'role', 'technician')
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute function public.handle_update_user();

-- =========================
-- 3. Backfill existing auth users into profiles
-- =========================
insert into public.profiles (id, full_name, email, role)
select
  id,
  coalesce(raw_user_meta_data->>'full_name', '') as full_name,
  coalesce(email, '') as email,
  coalesce(raw_app_meta_data->>'role', 'technician') as role
from auth.users
on conflict (id) do update set
  full_name = excluded.full_name,
  email = excluded.email,
  role = excluded.role;

-- =========================
-- 4. RLS for profiles
-- =========================
alter table public.profiles enable row level security;

grant select, update, delete on public.profiles to authenticated;

drop policy if exists profiles_admin_all on public.profiles;
drop policy if exists profiles_select_auth on public.profiles;
drop policy if exists profiles_update_auth on public.profiles;
drop policy if exists profiles_delete_auth on public.profiles;

create policy profiles_select_auth
on public.profiles for select to authenticated
using (true);

create policy profiles_update_auth
on public.profiles for update to authenticated
using (public.is_admin() or id = auth.uid())
with check (public.is_admin() or id = auth.uid());

create policy profiles_delete_auth
on public.profiles for delete to authenticated
using (public.is_admin());

-- =========================
-- 5. maintenance_logs: add technician_id, drop technician_name
-- =========================
alter table public.maintenance_logs
  add column if not exists technician_id uuid references public.profiles(id) on delete set null;

alter table public.maintenance_logs drop column if exists technician_name;

-- =========================
-- 6. maintenance_logs RLS (simplified — no more name matching)
-- =========================
drop policy if exists maintenance_logs_select_auth on public.maintenance_logs;
drop policy if exists maintenance_logs_insert_auth on public.maintenance_logs;
drop policy if exists maintenance_logs_update_auth on public.maintenance_logs;
drop policy if exists maintenance_logs_delete_auth on public.maintenance_logs;

create policy maintenance_logs_select_auth
on public.maintenance_logs for select to authenticated
using (public.is_admin() or technician_id = auth.uid());

create policy maintenance_logs_insert_auth
on public.maintenance_logs for insert to authenticated
with check (public.is_admin());

create policy maintenance_logs_update_auth
on public.maintenance_logs for update to authenticated
using (public.is_admin() or technician_id = auth.uid())
with check (public.is_admin() or technician_id = auth.uid());

create policy maintenance_logs_delete_auth
on public.maintenance_logs for delete to authenticated
using (public.is_admin());

-- =========================
-- 7. lifecycle_history RLS (technicians don't use this view)
-- =========================
drop policy if exists lifecycle_history_select_auth on public.lifecycle_history;

create policy lifecycle_history_select_auth
on public.lifecycle_history for select to authenticated
using (public.is_admin());

-- =========================
-- 8. Cleanup obsolete objects
-- =========================
drop function if exists public.is_assigned_technician(text);
drop table if exists public.technicians;
