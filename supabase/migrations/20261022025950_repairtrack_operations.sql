-- RepairTrack guarded operations.
-- Public functions are SECURITY INVOKER entry points for the Data API. The
-- private implementations run as SECURITY DEFINER with an empty search_path,
-- re-derive the actor from auth.uid(), and never accept a client owner_id.

-- ---------------------------------------------------------------------------
-- Internal helpers
-- ---------------------------------------------------------------------------

create function private.require_operator()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Sign in to continue.' using errcode = '28000';
  end if;
  if not exists (select 1 from public.profiles p where p.id = v_uid and p.is_active) then
    raise exception 'This account is not authorized for RepairTrack.' using errcode = '42501';
  end if;
  return v_uid;
end;
$$;

create function private.clean_text(p_value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(btrim(p_value), '');
$$;

create function private.next_document_number(p_owner uuid, p_type text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_year integer := extract(year from (now() at time zone 'Asia/Manila'))::integer;
  v_value bigint;
  v_prefix text := case p_type when 'repair' then 'RT' when 'receipt' then 'RC' end;
begin
  if v_prefix is null then
    raise exception 'Unknown document type %', p_type;
  end if;
  -- Single-statement upsert: the row lock serializes concurrent allocations.
  insert into private.document_counters as dc (owner_id, document_type, year, last_value)
  values (p_owner, p_type, v_year, 1)
  on conflict (owner_id, document_type, year)
  do update set last_value = dc.last_value + 1
  returning dc.last_value into v_value;

  return v_prefix || '-' || v_year::text || '-'
    || case when v_value >= 10000 then v_value::text else lpad(v_value::text, 4, '0') end;
end;
$$;

create function private.lock_repair(p_owner uuid, p_repair_id uuid)
returns public.repair_transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_repair public.repair_transactions;
begin
  select * into v_repair
  from public.repair_transactions r
  where r.owner_id = p_owner and r.id = p_repair_id
  for update;
  if not found then
    raise exception 'Repair not found.' using errcode = 'P0002';
  end if;
  return v_repair;
end;
$$;

create function private.repair_total_paid(p_owner uuid, p_repair_id uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(p.amount_centavos), 0)::bigint
  from public.payments p
  where p.owner_id = p_owner and p.repair_id = p_repair_id;
$$;

-- ---------------------------------------------------------------------------
-- Create repair
-- ---------------------------------------------------------------------------

create function private.create_repair(
  p_request_id uuid,
  p_customer_id uuid,
  p_device_id uuid,
  p_reported_problem text,
  p_service_diagnosis text,
  p_estimated_amount_centavos bigint,
  p_final_amount_centavos bigint,
  p_received_at timestamptz,
  p_expected_release_date date,
  p_notes text
)
returns public.repair_transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid := private.require_operator();
  v_repair public.repair_transactions;
  v_number text;
  v_received timestamptz := coalesce(p_received_at, now());
begin
  if p_request_id is null then
    raise exception 'A request id is required.' using errcode = '22023';
  end if;

  select * into v_repair from public.repair_transactions r
  where r.owner_id = v_owner and r.request_id = p_request_id;
  if found then
    if v_repair.customer_id <> p_customer_id or v_repair.device_id <> p_device_id
       or v_repair.reported_problem <> private.clean_text(p_reported_problem) then
      raise exception 'This request was already used for a different repair.' using errcode = '22023';
    end if;
    return v_repair;
  end if;

  if not exists (
    select 1 from public.devices d
    where d.owner_id = v_owner and d.customer_id = p_customer_id and d.id = p_device_id
  ) then
    raise exception 'The selected device does not belong to the selected customer.' using errcode = '23503';
  end if;
  if private.clean_text(p_reported_problem) is null then
    raise exception 'Describe the reported problem.' using errcode = '23514';
  end if;
  if v_received > now() + interval '5 minutes' then
    raise exception 'Date received cannot be in the future.' using errcode = '23514';
  end if;

  v_number := private.next_document_number(v_owner, 'repair');

  begin
    insert into public.repair_transactions (
      owner_id, customer_id, device_id, transaction_number, request_id,
      reported_problem, service_diagnosis, estimated_amount_centavos, final_amount_centavos,
      received_at, expected_release_date, notes
    ) values (
      v_owner, p_customer_id, p_device_id, v_number, p_request_id,
      private.clean_text(p_reported_problem), private.clean_text(p_service_diagnosis),
      p_estimated_amount_centavos, p_final_amount_centavos,
      v_received, p_expected_release_date, private.clean_text(p_notes)
    )
    returning * into v_repair;
  exception when unique_violation then
    -- A concurrent retry with the same request id won; return its result.
    select * into v_repair from public.repair_transactions r
    where r.owner_id = v_owner and r.request_id = p_request_id;
    if not found then
      raise;
    end if;
    return v_repair;
  end;

  insert into public.repair_status_history (owner_id, repair_id, from_status, to_status, changed_by)
  values (v_owner, v_repair.id, null, 'pending', v_owner);

  return v_repair;
end;
$$;

-- ---------------------------------------------------------------------------
-- Edit details (problem, diagnosis, estimate, expected date, notes)
-- ---------------------------------------------------------------------------

create function private.update_repair_details(
  p_repair_id uuid,
  p_reported_problem text,
  p_service_diagnosis text,
  p_estimated_amount_centavos bigint,
  p_expected_release_date date,
  p_notes text
)
returns public.repair_transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid := private.require_operator();
  v_repair public.repair_transactions := private.lock_repair(v_owner, p_repair_id);
begin
  if v_repair.status in ('released', 'cancelled') then
    raise exception 'Released or cancelled repairs can no longer be edited.' using errcode = '55000';
  end if;
  if v_repair.final_amount_centavos is not null
     and p_estimated_amount_centavos is distinct from v_repair.estimated_amount_centavos then
    raise exception 'The estimate is locked once the final amount is set.' using errcode = '55000';
  end if;
  if private.clean_text(p_reported_problem) is null then
    raise exception 'Describe the reported problem.' using errcode = '23514';
  end if;
  if v_repair.status = 'completed' and private.clean_text(p_service_diagnosis) is null then
    raise exception 'Completed repairs need a service or diagnosis.' using errcode = '23514';
  end if;

  update public.repair_transactions r set
    reported_problem = private.clean_text(p_reported_problem),
    service_diagnosis = private.clean_text(p_service_diagnosis),
    estimated_amount_centavos = p_estimated_amount_centavos,
    expected_release_date = p_expected_release_date,
    notes = private.clean_text(p_notes)
  where r.owner_id = v_owner and r.id = p_repair_id
  returning * into v_repair;
  return v_repair;
end;
$$;

-- ---------------------------------------------------------------------------
-- Finalize amount
-- ---------------------------------------------------------------------------

create function private.set_final_amount(p_repair_id uuid, p_final_amount_centavos bigint)
returns public.repair_transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid := private.require_operator();
  v_repair public.repair_transactions := private.lock_repair(v_owner, p_repair_id);
begin
  if p_final_amount_centavos is null or p_final_amount_centavos < 0 or p_final_amount_centavos > 999999999 then
    raise exception 'Enter a final amount between 0 and 9,999,999.99.' using errcode = '23514';
  end if;
  if v_repair.status not in ('pending', 'in_progress') then
    raise exception 'The final amount is locked after completion.' using errcode = '55000';
  end if;
  if exists (select 1 from public.payments p where p.owner_id = v_owner and p.repair_id = p_repair_id) then
    raise exception 'The final amount is locked after the first payment.' using errcode = '55000';
  end if;

  update public.repair_transactions r
  set final_amount_centavos = p_final_amount_centavos
  where r.owner_id = v_owner and r.id = p_repair_id
  returning * into v_repair;
  return v_repair;
end;
$$;

-- ---------------------------------------------------------------------------
-- Status transitions
-- ---------------------------------------------------------------------------

create function private.change_repair_status(
  p_repair_id uuid,
  p_expected_status public.repair_status,
  p_to_status public.repair_status,
  p_reason text
)
returns public.repair_transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid := private.require_operator();
  v_repair public.repair_transactions := private.lock_repair(v_owner, p_repair_id);
  v_from public.repair_status := v_repair.status;
  v_reason text := private.clean_text(p_reason);
begin
  -- Duplicate submit of an already-applied transition: return current state.
  if v_from = p_to_status and p_expected_status is distinct from p_to_status then
    return v_repair;
  end if;
  if v_from is distinct from p_expected_status then
    raise exception 'This repair changed since you opened it. Refresh and try again.' using errcode = '40001';
  end if;

  if v_from = 'pending' and p_to_status = 'in_progress' then
    update public.repair_transactions r set status = 'in_progress', started_at = now()
    where r.owner_id = v_owner and r.id = p_repair_id returning * into v_repair;

  elsif v_from = 'in_progress' and p_to_status = 'completed' then
    if private.clean_text(v_repair.service_diagnosis) is null then
      raise exception 'Record the service or diagnosis before completing.' using errcode = '23514';
    end if;
    if v_repair.final_amount_centavos is null then
      raise exception 'Set the final amount before completing.' using errcode = '23514';
    end if;
    update public.repair_transactions r set status = 'completed', completed_at = now()
    where r.owner_id = v_owner and r.id = p_repair_id returning * into v_repair;

  elsif v_from = 'completed' and p_to_status = 'released' then
    if v_repair.final_amount_centavos - private.repair_total_paid(v_owner, p_repair_id) <> 0 then
      raise exception 'Collect the remaining balance before releasing the device.' using errcode = '23514';
    end if;
    update public.repair_transactions r set status = 'released', released_at = now()
    where r.owner_id = v_owner and r.id = p_repair_id returning * into v_repair;

  elsif v_from in ('pending', 'in_progress') and p_to_status = 'cancelled' then
    if v_reason is null then
      raise exception 'Give a reason for cancelling.' using errcode = '23514';
    end if;
    if exists (select 1 from public.payments p where p.owner_id = v_owner and p.repair_id = p_repair_id) then
      raise exception 'Repairs with recorded payments cannot be cancelled.' using errcode = '55000';
    end if;
    update public.repair_transactions r
    set status = 'cancelled', cancelled_at = now(), cancellation_reason = v_reason
    where r.owner_id = v_owner and r.id = p_repair_id returning * into v_repair;

  else
    raise exception 'A repair cannot move from % to %.', v_from, p_to_status using errcode = '23514';
  end if;

  insert into public.repair_status_history (owner_id, repair_id, from_status, to_status, changed_by, reason)
  values (v_owner, p_repair_id, v_from, p_to_status, v_owner, v_reason);

  return v_repair;
end;
$$;

-- ---------------------------------------------------------------------------
-- Record payment + issue receipt atomically
-- ---------------------------------------------------------------------------

create function private.record_payment(
  p_request_id uuid,
  p_repair_id uuid,
  p_amount_centavos bigint,
  p_method public.payment_method,
  p_reference text
)
returns public.receipts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid := private.require_operator();
  v_repair public.repair_transactions;
  v_existing public.payments;
  v_payment public.payments;
  v_receipt public.receipts;
  v_paid_before bigint;
  v_balance_after bigint;
  v_customer public.customers;
  v_device public.devices;
  v_shop public.shop_settings;
  v_operator text;
  v_number text;
begin
  if p_request_id is null then
    raise exception 'A request id is required.' using errcode = '22023';
  end if;

  -- Lock first so a concurrent retry with the same request id observes the winner.
  v_repair := private.lock_repair(v_owner, p_repair_id);

  select * into v_existing from public.payments p
  where p.owner_id = v_owner and p.request_id = p_request_id;
  if found then
    if v_existing.repair_id <> p_repair_id or v_existing.amount_centavos <> p_amount_centavos
       or v_existing.method <> p_method then
      raise exception 'This request was already used for a different payment.' using errcode = '22023';
    end if;
    select * into v_receipt from public.receipts rc
    where rc.owner_id = v_owner and rc.payment_id = v_existing.id;
    return v_receipt;
  end if;

  if v_repair.status in ('released', 'cancelled') then
    raise exception 'Payments cannot be added to released or cancelled repairs.' using errcode = '55000';
  end if;
  if v_repair.final_amount_centavos is null then
    raise exception 'Set the final amount before recording a payment.' using errcode = '55000';
  end if;
  if p_amount_centavos is null or p_amount_centavos <= 0 then
    raise exception 'Payment amount must be greater than zero.' using errcode = '23514';
  end if;

  v_paid_before := private.repair_total_paid(v_owner, p_repair_id);
  if p_amount_centavos > v_repair.final_amount_centavos - v_paid_before then
    raise exception 'Payment exceeds the remaining balance.' using errcode = '23514';
  end if;
  v_balance_after := v_repair.final_amount_centavos - v_paid_before - p_amount_centavos;

  insert into public.payments (owner_id, repair_id, amount_centavos, method, reference, recorded_by, request_id)
  values (v_owner, p_repair_id, p_amount_centavos, p_method, private.clean_text(p_reference), v_owner, p_request_id)
  returning * into v_payment;

  select * into v_customer from public.customers c where c.owner_id = v_owner and c.id = v_repair.customer_id;
  select * into v_device from public.devices d where d.owner_id = v_owner and d.id = v_repair.device_id;
  select * into v_shop from public.shop_settings s where s.owner_id = v_owner;
  select p.display_name into v_operator from public.profiles p where p.id = v_owner;

  v_number := private.next_document_number(v_owner, 'receipt');

  insert into public.receipts (owner_id, repair_id, payment_id, receipt_number, issued_at, template_version, snapshot)
  values (
    v_owner, p_repair_id, v_payment.id, v_number, v_payment.paid_at, 1,
    jsonb_build_object(
      'template_version', 1,
      'receipt_number', v_number,
      'transaction_number', v_repair.transaction_number,
      'issued_at', v_payment.paid_at,
      'shop', jsonb_build_object(
        'name', coalesce(v_shop.shop_name, 'RepairTrack'),
        'contact_number', v_shop.contact_number,
        'address', v_shop.address,
        'receipt_footer', v_shop.receipt_footer
      ),
      'operator_name', v_operator,
      'customer', jsonb_build_object(
        'full_name', v_customer.full_name,
        'contact_number', v_customer.contact_number
      ),
      'device', jsonb_build_object(
        'device_type', v_device.device_type,
        'brand', v_device.brand,
        'model', v_device.model,
        'serial_number', v_device.serial_number
      ),
      'service_label', case when v_repair.service_diagnosis is null then 'Reported problem' else 'Service / Diagnosis' end,
      'service_text', coalesce(v_repair.service_diagnosis, v_repair.reported_problem),
      'final_amount_centavos', v_repair.final_amount_centavos,
      'payment_amount_centavos', v_payment.amount_centavos,
      'total_paid_centavos', v_paid_before + v_payment.amount_centavos,
      'balance_centavos', v_balance_after,
      'payment_method', v_payment.method,
      'payment_reference', v_payment.reference,
      'payment_status', case when v_balance_after = 0 then 'paid' else 'partial' end
    )
  )
  returning * into v_receipt;

  return v_receipt;
end;
$$;

-- ---------------------------------------------------------------------------
-- Postgres-only maintenance: scoped fixture cleanup (never granted to clients)
-- ---------------------------------------------------------------------------

create function private.remove_demo_data()
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_count integer := 0;
  v_rows integer;
begin
  perform set_config('repairtrack.fixture_cleanup', 'on', true);
  delete from public.receipts where id in (select record_id from private.demo_manifest where table_name = 'receipts');
  get diagnostics v_rows = row_count; v_count := v_count + v_rows;
  delete from public.payments where id in (select record_id from private.demo_manifest where table_name = 'payments');
  get diagnostics v_rows = row_count; v_count := v_count + v_rows;
  delete from public.repair_status_history h
  where h.repair_id in (select record_id from private.demo_manifest where table_name = 'repair_transactions');
  get diagnostics v_rows = row_count; v_count := v_count + v_rows;
  delete from public.repair_transactions where id in (select record_id from private.demo_manifest where table_name = 'repair_transactions');
  get diagnostics v_rows = row_count; v_count := v_count + v_rows;
  delete from public.devices where id in (select record_id from private.demo_manifest where table_name = 'devices');
  get diagnostics v_rows = row_count; v_count := v_count + v_rows;
  delete from public.customers where id in (select record_id from private.demo_manifest where table_name = 'customers');
  get diagnostics v_rows = row_count; v_count := v_count + v_rows;
  delete from private.demo_manifest;
  return v_count;
end;
$$;

create function private.purge_fixture_owner(p_owner uuid)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_count integer := 0;
  v_rows integer;
begin
  if not exists (select 1 from private.fixture_owners f where f.owner_id = p_owner) then
    raise exception 'Owner % is not a registered test fixture.', p_owner;
  end if;
  perform set_config('repairtrack.fixture_cleanup', 'on', true);
  delete from public.receipts where owner_id = p_owner;
  get diagnostics v_rows = row_count; v_count := v_count + v_rows;
  delete from public.payments where owner_id = p_owner;
  get diagnostics v_rows = row_count; v_count := v_count + v_rows;
  delete from public.repair_status_history where owner_id = p_owner;
  get diagnostics v_rows = row_count; v_count := v_count + v_rows;
  delete from public.repair_transactions where owner_id = p_owner;
  get diagnostics v_rows = row_count; v_count := v_count + v_rows;
  delete from public.devices where owner_id = p_owner;
  get diagnostics v_rows = row_count; v_count := v_count + v_rows;
  delete from public.customers where owner_id = p_owner;
  get diagnostics v_rows = row_count; v_count := v_count + v_rows;
  delete from private.document_counters where owner_id = p_owner;
  delete from public.shop_settings where owner_id = p_owner;
  delete from public.profiles where id = p_owner;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Public Data API entry points (SECURITY INVOKER)
-- ---------------------------------------------------------------------------

create function public.create_repair(
  p_request_id uuid,
  p_customer_id uuid,
  p_device_id uuid,
  p_reported_problem text,
  p_service_diagnosis text default null,
  p_estimated_amount_centavos bigint default null,
  p_final_amount_centavos bigint default null,
  p_received_at timestamptz default null,
  p_expected_release_date date default null,
  p_notes text default null
)
returns public.repair_transactions
language sql
security invoker
set search_path = ''
as $$
  select * from private.create_repair(
    p_request_id, p_customer_id, p_device_id, p_reported_problem, p_service_diagnosis,
    p_estimated_amount_centavos, p_final_amount_centavos, p_received_at, p_expected_release_date, p_notes
  );
$$;

create function public.update_repair_details(
  p_repair_id uuid,
  p_reported_problem text,
  p_service_diagnosis text default null,
  p_estimated_amount_centavos bigint default null,
  p_expected_release_date date default null,
  p_notes text default null
)
returns public.repair_transactions
language sql
security invoker
set search_path = ''
as $$
  select * from private.update_repair_details(
    p_repair_id, p_reported_problem, p_service_diagnosis, p_estimated_amount_centavos, p_expected_release_date, p_notes
  );
$$;

create function public.set_final_amount(p_repair_id uuid, p_final_amount_centavos bigint)
returns public.repair_transactions
language sql
security invoker
set search_path = ''
as $$
  select * from private.set_final_amount(p_repair_id, p_final_amount_centavos);
$$;

create function public.change_repair_status(
  p_repair_id uuid,
  p_expected_status public.repair_status,
  p_to_status public.repair_status,
  p_reason text default null
)
returns public.repair_transactions
language sql
security invoker
set search_path = ''
as $$
  select * from private.change_repair_status(p_repair_id, p_expected_status, p_to_status, p_reason);
$$;

create function public.record_payment(
  p_request_id uuid,
  p_repair_id uuid,
  p_amount_centavos bigint,
  p_method public.payment_method,
  p_reference text default null
)
returns public.receipts
language sql
security invoker
set search_path = ''
as $$
  select * from private.record_payment(p_request_id, p_repair_id, p_amount_centavos, p_method, p_reference);
$$;

-- Read RPCs rely on the caller's RLS.

create function public.search_repairs(
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
  where (p_status is null or o.status = p_status)
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

create function public.search_customers(
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
  where q.is_empty or c.full_name ilike q.pattern or c.contact_number ilike q.pattern
  order by c.full_name, c.id
  limit least(greatest(coalesce(p_limit, 25), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

create function public.dashboard_summary()
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
    (select count(*) from public.repair_transactions r where r.status = 'pending')::integer,
    (select count(*) from public.repair_transactions r where r.status = 'in_progress')::integer,
    (select count(*) from public.repair_transactions r where r.status = 'completed')::integer,
    (select coalesce(sum(p.amount_centavos), 0) from public.payments p
      where p.paid_at >= (b.local_start at time zone 'Asia/Manila')
        and p.paid_at < ((b.local_start + interval '1 month') at time zone 'Asia/Manila'))::bigint,
    b.local_start::date
  from bounds b;
$$;

create function public.report_summary(p_start date, p_end date)
returns table (
  total_count integer,
  pending_count integer,
  in_progress_count integer,
  completed_count integer,
  released_count integer,
  cancelled_count integer,
  collections_centavos bigint,
  payment_count integer
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_from timestamptz;
  v_to timestamptz;
begin
  if p_start is null or p_end is null or p_end < p_start then
    raise exception 'Choose a valid date range.' using errcode = '22023';
  end if;
  v_from := p_start::timestamp at time zone 'Asia/Manila';
  v_to := (p_end + 1)::timestamp at time zone 'Asia/Manila';

  return query
  with repairs as (
    select r.status from public.repair_transactions r
    where r.received_at >= v_from and r.received_at < v_to
  ), pay as (
    select coalesce(sum(p.amount_centavos), 0)::bigint as total, count(*)::integer as n
    from public.payments p
    where p.paid_at >= v_from and p.paid_at < v_to
  )
  select
    (select count(*) from repairs)::integer,
    (select count(*) from repairs where status = 'pending')::integer,
    (select count(*) from repairs where status = 'in_progress')::integer,
    (select count(*) from repairs where status = 'completed')::integer,
    (select count(*) from repairs where status = 'released')::integer,
    (select count(*) from repairs where status = 'cancelled')::integer,
    pay.total,
    pay.n
  from pay;
end;
$$;

create function public.monthly_collections(p_year integer)
returns table (month integer, collections_centavos bigint, payment_count integer)
language sql
stable
security invoker
set search_path = ''
as $$
  with months as (
    select generate_series(1, 12) as month
  ), pay as (
    select extract(month from (p.paid_at at time zone 'Asia/Manila'))::integer as month,
           sum(p.amount_centavos)::bigint as total,
           count(*)::integer as n
    from public.payments p
    where p.paid_at >= (make_date(p_year, 1, 1)::timestamp at time zone 'Asia/Manila')
      and p.paid_at < (make_date(p_year + 1, 1, 1)::timestamp at time zone 'Asia/Manila')
    group by 1
  )
  select m.month, coalesce(pay.total, 0)::bigint, coalesce(pay.n, 0)::integer
  from months m left join pay on pay.month = m.month
  order by m.month;
$$;

-- ---------------------------------------------------------------------------
-- Execute grants
-- ---------------------------------------------------------------------------

revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function
  private.is_active_operator(),
  private.require_operator(),
  private.clean_text(text),
  private.create_repair(uuid, uuid, uuid, text, text, bigint, bigint, timestamptz, date, text),
  private.update_repair_details(uuid, text, text, bigint, date, text),
  private.set_final_amount(uuid, bigint),
  private.change_repair_status(uuid, public.repair_status, public.repair_status, text),
  private.record_payment(uuid, uuid, bigint, public.payment_method, text)
  to authenticated;

revoke all on function
  public.create_repair(uuid, uuid, uuid, text, text, bigint, bigint, timestamptz, date, text),
  public.update_repair_details(uuid, text, text, bigint, date, text),
  public.set_final_amount(uuid, bigint),
  public.change_repair_status(uuid, public.repair_status, public.repair_status, text),
  public.record_payment(uuid, uuid, bigint, public.payment_method, text),
  public.search_repairs(text, public.repair_status, integer, integer),
  public.search_customers(text, integer, integer),
  public.dashboard_summary(),
  public.report_summary(date, date),
  public.monthly_collections(integer)
  from public, anon;

grant execute on function
  public.create_repair(uuid, uuid, uuid, text, text, bigint, bigint, timestamptz, date, text),
  public.update_repair_details(uuid, text, text, bigint, date, text),
  public.set_final_amount(uuid, bigint),
  public.change_repair_status(uuid, public.repair_status, public.repair_status, text),
  public.record_payment(uuid, uuid, bigint, public.payment_method, text),
  public.search_repairs(text, public.repair_status, integer, integer),
  public.search_customers(text, integer, integer),
  public.dashboard_summary(),
  public.report_summary(date, date),
  public.monthly_collections(integer)
  to authenticated;
