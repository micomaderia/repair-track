-- Public signup provisions one isolated shop per auth user.
-- Existing owners, receipts, payments, and immutable history are unchanged.
create function private.provision_shop_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  full_name text := btrim(coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  shop_name text := btrim(coalesce(new.raw_user_meta_data ->> 'shop_name', ''));
begin
  -- Metadata supplies display text only. Ownership always comes from auth.users.id.
  if char_length(full_name) not between 1 and 120 or char_length(shop_name) not between 1 and 120 then
    raise exception 'Full name and shop name are required (maximum 120 characters)' using errcode = '22023';
  end if;
  insert into public.profiles(id, display_name, is_active) values (new.id, full_name, true);
  insert into public.shop_settings(owner_id, shop_name) values (new.id, shop_name);
  return new;
end;
$$;
revoke all on function private.provision_shop_owner() from public, anon, authenticated;
create trigger provision_shop_owner after insert on auth.users
  for each row execute function private.provision_shop_owner();

alter table public.customers add column archived_at timestamptz;
alter table public.repair_transactions add column archived_at timestamptz;
create index customers_archive_idx on public.customers(owner_id, archived_at, full_name);
create index repairs_archive_idx on public.repair_transactions(owner_id, archived_at, received_at desc);

-- Only guarded archive functions can change the archive flag.
create function private.set_record_archived(p_kind text, p_id uuid, p_archived boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := private.require_operator();
begin
  if p_kind = 'repair' then
    perform 1 from public.repair_transactions where id = p_id and owner_id = v_owner for update;
    if not found then raise exception 'Repair not found' using errcode = '42501'; end if;
    update public.repair_transactions set archived_at = case when p_archived then now() else null end
      where id = p_id and owner_id = v_owner;
  elsif p_kind = 'customer' then
    -- Serialize with repair creation, whose foreign key acquires a key-share lock.
    perform 1 from public.customers where id = p_id and owner_id = v_owner for update;
    if not found then raise exception 'Customer not found' using errcode = '42501'; end if;
    if p_archived and exists (select 1 from public.repair_transactions
      where customer_id = p_id and owner_id = v_owner and status in ('pending', 'in_progress', 'completed')) then
      raise exception 'Finish or release this customer''s active repairs before archiving.' using errcode = '22023';
    end if;
    update public.customers set archived_at = case when p_archived then now() else null end
      where id = p_id and owner_id = v_owner;
  else raise exception 'Unknown record type' using errcode = '22023';
  end if;
end;
$$;
revoke all on function private.set_record_archived(text, uuid, boolean) from public, anon, authenticated;
grant execute on function private.set_record_archived(text, uuid, boolean) to authenticated;
create function public.set_record_archived(p_kind text, p_id uuid, p_archived boolean)
returns void language sql security invoker set search_path = '' as $$
  select private.set_record_archived(p_kind, p_id, p_archived);
$$;
revoke all on function public.set_record_archived(text, uuid, boolean) from public, anon;
grant execute on function public.set_record_archived(text, uuid, boolean) to authenticated;

create or replace view public.repair_overview
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
  r.updated_at,
  r.archived_at
from public.repair_transactions r
join public.customers c on c.owner_id = r.owner_id and c.id = r.customer_id
join public.devices d on d.owner_id = r.owner_id and d.customer_id = r.customer_id and d.id = r.device_id
left join lateral (
  select sum(pay.amount_centavos) as total_paid, count(*) as payment_count
  from public.payments pay
  where pay.owner_id = r.owner_id and pay.repair_id = r.id
) p on true;


create or replace function public.search_repairs(
  p_query text default null,
  p_status public.repair_status default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns setof public.repair_overview
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (
    select '%' || replace(replace(replace(btrim(coalesce(p_query, '')), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pattern,
           btrim(coalesce(p_query, '')) = '' as is_empty
  )
  select o.*
  from public.repair_overview o, q
  where o.archived_at is null and (p_status is null or o.status = p_status)
    and (
      q.is_empty
      or o.transaction_number ilike q.pattern
      or o.customer_name ilike q.pattern
      or o.device_type ilike q.pattern
      or o.brand ilike q.pattern
      or o.model ilike q.pattern
      or o.serial_number ilike q.pattern
    )
  order by o.received_at desc, o.id desc
  limit least(greatest(coalesce(p_limit, 25), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

create or replace function public.search_customers(
  p_query text default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns setof public.customers
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (
    select '%' || replace(replace(replace(btrim(coalesce(p_query, '')), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pattern,
           btrim(coalesce(p_query, '')) = '' as is_empty
  )
  select c.*
  from public.customers c, q
  where c.archived_at is null and (q.is_empty or c.full_name ilike q.pattern or c.contact_number ilike q.pattern)
  order by c.full_name, c.id
  limit least(greatest(coalesce(p_limit, 25), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

create or replace function public.dashboard_summary()
returns table (
  pending_count integer,
  in_progress_count integer,
  completed_count integer,
  collected_this_month_centavos bigint,
  month_start date
)
language sql
stable
security invoker
set search_path = ''
as $$
  with bounds as (
    select date_trunc('month', now() at time zone 'Asia/Manila') as local_start
  )
  select
    (select count(*) from public.repair_transactions r where r.archived_at is null and r.status = 'pending')::integer,
    (select count(*) from public.repair_transactions r where r.archived_at is null and r.status = 'in_progress')::integer,
    (select count(*) from public.repair_transactions r where r.archived_at is null and r.status = 'completed')::integer,
    (select coalesce(sum(p.amount_centavos), 0) from public.payments p
      where p.paid_at >= (b.local_start at time zone 'Asia/Manila')
        and p.paid_at < ((b.local_start + interval '1 month') at time zone 'Asia/Manila'))::bigint,
    b.local_start::date
  from bounds b;
$$;


create function public.search_archived_repairs(
  p_query text default null,
  p_status public.repair_status default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns setof public.repair_overview
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (
    select '%' || replace(replace(replace(btrim(coalesce(p_query, '')), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pattern,
           btrim(coalesce(p_query, '')) = '' as is_empty
  )
  select o.*
  from public.repair_overview o, q
  where o.archived_at is not null and (p_status is null or o.status = p_status)
    and (
      q.is_empty
      or o.transaction_number ilike q.pattern
      or o.customer_name ilike q.pattern
      or o.device_type ilike q.pattern
      or o.brand ilike q.pattern
      or o.model ilike q.pattern
      or o.serial_number ilike q.pattern
    )
  order by o.received_at desc, o.id desc
  limit least(greatest(coalesce(p_limit, 25), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

create function public.search_archived_customers(
  p_query text default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns setof public.customers
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (
    select '%' || replace(replace(replace(btrim(coalesce(p_query, '')), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pattern,
           btrim(coalesce(p_query, '')) = '' as is_empty
  )
  select c.*
  from public.customers c, q
  where c.archived_at is not null and (q.is_empty or c.full_name ilike q.pattern or c.contact_number ilike q.pattern)
  order by c.full_name, c.id
  limit least(greatest(coalesce(p_limit, 25), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;


revoke all on function public.search_archived_repairs(text, public.repair_status, integer, integer) from public, anon;
revoke all on function public.search_archived_customers(text, integer, integer) from public, anon;
grant execute on function public.search_archived_repairs(text, public.repair_status, integer, integer) to authenticated;
grant execute on function public.search_archived_customers(text, integer, integer) to authenticated;

-- Reject direct intake for an archived customer while preserving all old links.
create function private.require_unarchived_customer()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.customers where id = new.customer_id and owner_id = new.owner_id
    and archived_at is null for key share;
  if not found then raise exception 'Restore this customer before adding a repair.' using errcode = '22023'; end if;
  return new;
end;
$$;
revoke all on function private.require_unarchived_customer() from public, anon, authenticated;
create trigger require_unarchived_customer before insert on public.repair_transactions
  for each row execute function private.require_unarchived_customer();

-- Reporting deliberately includes archived history. No DELETE grants are added.
notify pgrst, 'reload schema';
