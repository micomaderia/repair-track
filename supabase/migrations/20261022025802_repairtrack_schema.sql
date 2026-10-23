-- RepairTrack core schema: tables, constraints, indexes, RLS, grants.
-- Business writes for repairs, payments, receipts and status history go through
-- guarded functions (see 20261022025950_repairtrack_operations.sql).

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create type public.repair_status as enum ('pending', 'in_progress', 'completed', 'released', 'cancelled');
create type public.payment_method as enum ('cash', 'gcash', 'bank_transfer');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create function private.reject_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Demo/fixture cleanup is the only sanctioned removal path; it sets this flag
  -- transaction-locally from a postgres-only maintenance function.
  if tg_op = 'DELETE' and current_setting('repairtrack.fixture_cleanup', true) = 'on' then
    return old;
  end if;
  raise exception '% rows are immutable', tg_table_name using errcode = '42501';
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete restrict,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 120),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function private.is_active_operator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.is_active
  );
$$;
revoke all on function private.is_active_operator() from public, anon;
grant execute on function private.is_active_operator() to authenticated;

create table public.shop_settings (
  owner_id uuid primary key references public.profiles (id) on delete restrict,
  shop_name text not null check (char_length(btrim(shop_name)) between 1 and 120),
  contact_number text check (contact_number is null or char_length(btrim(contact_number)) between 1 and 32),
  address text check (address is null or char_length(address) <= 300),
  receipt_footer text check (receipt_footer is null or char_length(receipt_footer) <= 300),
  currency text not null default 'PHP' check (currency = 'PHP'),
  time_zone text not null default 'Asia/Manila' check (time_zone = 'Asia/Manila'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  full_name text not null check (char_length(btrim(full_name)) between 1 and 120),
  contact_number text not null check (char_length(btrim(contact_number)) between 1 and 32),
  address text check (address is null or char_length(address) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, id)
);
create index customers_owner_name_idx on public.customers (owner_id, full_name, id);

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  customer_id uuid not null,
  device_type text not null check (char_length(btrim(device_type)) between 1 and 60),
  brand text not null check (char_length(btrim(brand)) between 1 and 100),
  model text not null check (char_length(btrim(model)) between 1 and 100),
  serial_number text check (serial_number is null or char_length(btrim(serial_number)) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (owner_id, customer_id) references public.customers (owner_id, id) on delete restrict,
  unique (owner_id, customer_id, id)
);
create index devices_owner_customer_idx on public.devices (owner_id, customer_id);

create table public.repair_transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete restrict,
  customer_id uuid not null,
  device_id uuid not null,
  transaction_number text not null,
  request_id uuid not null,
  reported_problem text not null check (char_length(btrim(reported_problem)) between 1 and 2000),
  service_diagnosis text check (service_diagnosis is null or char_length(service_diagnosis) <= 2000),
  estimated_amount_centavos bigint check (estimated_amount_centavos between 0 and 999999999),
  final_amount_centavos bigint check (final_amount_centavos between 0 and 999999999),
  status public.repair_status not null default 'pending',
  received_at timestamptz not null default now(),
  expected_release_date date,
  started_at timestamptz,
  completed_at timestamptz,
  released_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text check (cancellation_reason is null or char_length(btrim(cancellation_reason)) between 1 and 500),
  notes text check (notes is null or char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, id),
  unique (owner_id, transaction_number),
  unique (owner_id, request_id),
  foreign key (owner_id, customer_id) references public.customers (owner_id, id) on delete restrict,
  foreign key (owner_id, customer_id, device_id) references public.devices (owner_id, customer_id, id) on delete restrict,
  constraint repair_expected_after_received check (
    expected_release_date is null
    or expected_release_date >= (received_at at time zone 'Asia/Manila')::date
  ),
  constraint repair_started_matches_status check (
    (status = 'pending' and started_at is null)
    or (status in ('in_progress', 'completed', 'released') and started_at is not null)
    or status = 'cancelled'
  ),
  constraint repair_completed_matches_status check (
    (status in ('completed', 'released')) = (completed_at is not null)
  ),
  constraint repair_released_matches_status check ((status = 'released') = (released_at is not null)),
  constraint repair_cancelled_matches_status check (
    (status = 'cancelled') = (cancelled_at is not null)
    and (status = 'cancelled') = (cancellation_reason is not null)
  ),
  constraint repair_completion_requirements check (
    status not in ('completed', 'released')
    or (final_amount_centavos is not null and char_length(btrim(coalesce(service_diagnosis, ''))) > 0)
  )
);
create index repairs_owner_status_received_idx on public.repair_transactions (owner_id, status, received_at desc, id);
create index repairs_owner_received_idx on public.repair_transactions (owner_id, received_at desc, id);
create index repairs_owner_customer_idx on public.repair_transactions (owner_id, customer_id, received_at desc);
create index repairs_owner_device_idx on public.repair_transactions (owner_id, customer_id, device_id, received_at desc);

create table public.repair_status_history (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  repair_id uuid not null,
  from_status public.repair_status,
  to_status public.repair_status not null,
  changed_at timestamptz not null default now(),
  changed_by uuid not null references public.profiles (id) on delete restrict,
  reason text check (reason is null or char_length(reason) <= 500),
  foreign key (owner_id, repair_id) references public.repair_transactions (owner_id, id) on delete restrict
);
create index status_history_repair_idx on public.repair_status_history (owner_id, repair_id, changed_at, id);
create index status_history_changed_by_idx on public.repair_status_history (changed_by);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  repair_id uuid not null,
  amount_centavos bigint not null check (amount_centavos > 0 and amount_centavos <= 999999999),
  method public.payment_method not null,
  reference text check (reference is null or char_length(btrim(reference)) between 1 and 100),
  paid_at timestamptz not null default now(),
  recorded_by uuid not null references public.profiles (id) on delete restrict,
  request_id uuid not null,
  created_at timestamptz not null default now(),
  unique (owner_id, request_id),
  unique (owner_id, repair_id, id),
  foreign key (owner_id, repair_id) references public.repair_transactions (owner_id, id) on delete restrict
);
create index payments_repair_idx on public.payments (owner_id, repair_id, paid_at, id);
create index payments_owner_paid_at_idx on public.payments (owner_id, paid_at);
create index payments_recorded_by_idx on public.payments (recorded_by);

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  repair_id uuid not null,
  payment_id uuid not null unique,
  receipt_number text not null,
  issued_at timestamptz not null default now(),
  template_version integer not null default 1 check (template_version > 0),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  unique (owner_id, receipt_number),
  foreign key (owner_id, repair_id, payment_id) references public.payments (owner_id, repair_id, id) on delete restrict
);
create index receipts_repair_idx on public.receipts (owner_id, repair_id, issued_at, id);

-- Year-aware document counters. Never exposed through the Data API.
create table private.document_counters (
  owner_id uuid not null references public.profiles (id) on delete restrict,
  document_type text not null check (document_type in ('repair', 'receipt')),
  year integer not null check (year between 2000 and 9999),
  last_value bigint not null check (last_value > 0),
  primary key (owner_id, document_type, year)
);

-- Deterministic demo record manifest and test-fixture owners, used only by
-- postgres-only maintenance functions for scoped cleanup.
create table private.demo_manifest (
  table_name text not null,
  record_id uuid not null,
  primary key (table_name, record_id)
);
create table private.fixture_owners (
  owner_id uuid primary key,
  label text not null
);
revoke all on all tables in schema private from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger shop_settings_updated_at before update on public.shop_settings
  for each row execute function private.set_updated_at();
create trigger customers_updated_at before update on public.customers
  for each row execute function private.set_updated_at();
create trigger devices_updated_at before update on public.devices
  for each row execute function private.set_updated_at();
create trigger repairs_updated_at before update on public.repair_transactions
  for each row execute function private.set_updated_at();

create trigger payments_immutable before update or delete on public.payments
  for each row execute function private.reject_mutation();
create trigger receipts_immutable before update or delete on public.receipts
  for each row execute function private.reject_mutation();
create trigger status_history_immutable before update or delete on public.repair_status_history
  for each row execute function private.reject_mutation();

-- ---------------------------------------------------------------------------
-- Grants: deny by default, then grant the minimum per role.
-- ---------------------------------------------------------------------------

revoke all on public.profiles, public.shop_settings, public.customers, public.devices,
  public.repair_transactions, public.repair_status_history, public.payments, public.receipts
  from public, anon, authenticated;

grant select on public.profiles, public.shop_settings, public.customers, public.devices,
  public.repair_transactions, public.repair_status_history, public.payments, public.receipts
  to authenticated;

grant update (display_name) on public.profiles to authenticated;
grant update (shop_name, contact_number, address, receipt_footer) on public.shop_settings to authenticated;
grant insert (full_name, contact_number, address) on public.customers to authenticated;
grant update (full_name, contact_number, address) on public.customers to authenticated;
-- customer_id is insert-only: a device can never be reassigned to another customer.
grant insert (customer_id, device_type, brand, model, serial_number) on public.devices to authenticated;
grant update (device_type, brand, model, serial_number) on public.devices to authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.shop_settings enable row level security;
alter table public.customers enable row level security;
alter table public.devices enable row level security;
alter table public.repair_transactions enable row level security;
alter table public.repair_status_history enable row level security;
alter table public.payments enable row level security;
alter table public.receipts enable row level security;
alter table private.document_counters enable row level security;
alter table private.demo_manifest enable row level security;
alter table private.fixture_owners enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid()) and is_active)
  with check (id = (select auth.uid()) and is_active);

create policy shop_settings_select_own on public.shop_settings for select to authenticated
  using (owner_id = (select auth.uid()) and (select private.is_active_operator()));
create policy shop_settings_update_own on public.shop_settings for update to authenticated
  using (owner_id = (select auth.uid()) and (select private.is_active_operator()))
  with check (owner_id = (select auth.uid()) and (select private.is_active_operator()));

create policy customers_select_own on public.customers for select to authenticated
  using (owner_id = (select auth.uid()) and (select private.is_active_operator()));
create policy customers_insert_own on public.customers for insert to authenticated
  with check (owner_id = (select auth.uid()) and (select private.is_active_operator()));
create policy customers_update_own on public.customers for update to authenticated
  using (owner_id = (select auth.uid()) and (select private.is_active_operator()))
  with check (owner_id = (select auth.uid()) and (select private.is_active_operator()));

create policy devices_select_own on public.devices for select to authenticated
  using (owner_id = (select auth.uid()) and (select private.is_active_operator()));
create policy devices_insert_own on public.devices for insert to authenticated
  with check (owner_id = (select auth.uid()) and (select private.is_active_operator()));
create policy devices_update_own on public.devices for update to authenticated
  using (owner_id = (select auth.uid()) and (select private.is_active_operator()))
  with check (owner_id = (select auth.uid()) and (select private.is_active_operator()));

create policy repairs_select_own on public.repair_transactions for select to authenticated
  using (owner_id = (select auth.uid()) and (select private.is_active_operator()));
create policy status_history_select_own on public.repair_status_history for select to authenticated
  using (owner_id = (select auth.uid()) and (select private.is_active_operator()));
create policy payments_select_own on public.payments for select to authenticated
  using (owner_id = (select auth.uid()) and (select private.is_active_operator()));
create policy receipts_select_own on public.receipts for select to authenticated
  using (owner_id = (select auth.uid()) and (select private.is_active_operator()));

-- ---------------------------------------------------------------------------
-- Read model: live totals and derived payment status. security_invoker keeps
-- the caller's RLS in force.
-- ---------------------------------------------------------------------------

create view public.repair_overview
with (security_invoker = true)
as
select
  r.id,
  r.owner_id,
  r.transaction_number,
  r.status,
  r.customer_id,
  c.full_name as customer_name,
  c.contact_number as customer_contact,
  r.device_id,
  d.device_type,
  d.brand,
  d.model,
  d.serial_number,
  r.reported_problem,
  r.service_diagnosis,
  r.estimated_amount_centavos,
  r.final_amount_centavos,
  coalesce(p.total_paid, 0)::bigint as total_paid_centavos,
  case when r.final_amount_centavos is null then null
       else r.final_amount_centavos - coalesce(p.total_paid, 0) end::bigint as balance_centavos,
  case
    when r.final_amount_centavos is null then 'not_set'
    when coalesce(p.total_paid, 0) >= r.final_amount_centavos then 'paid'
    when coalesce(p.total_paid, 0) > 0 then 'partial'
    else 'unpaid'
  end as payment_status,
  coalesce(p.payment_count, 0)::integer as payment_count,
  r.received_at,
  r.expected_release_date,
  r.started_at,
  r.completed_at,
  r.released_at,
  r.cancelled_at,
  r.cancellation_reason,
  r.notes,
  r.created_at,
  r.updated_at
from public.repair_transactions r
join public.customers c on c.owner_id = r.owner_id and c.id = r.customer_id
join public.devices d on d.owner_id = r.owner_id and d.customer_id = r.customer_id and d.id = r.device_id
left join lateral (
  select sum(pay.amount_centavos) as total_paid, count(*) as payment_count
  from public.payments pay
  where pay.owner_id = r.owner_id and pay.repair_id = r.id
) p on true;

revoke all on public.repair_overview from public, anon, authenticated;
grant select on public.repair_overview to authenticated;
