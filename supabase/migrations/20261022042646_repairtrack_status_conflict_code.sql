-- PostgREST retries SQLSTATE 40001 (serialization_failure) automatically, so a
-- stale-status rejection looped until the gateway timed out. PT409 maps to a
-- plain HTTP 409 Conflict instead.

create or replace function private.change_repair_status(
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
    raise exception 'This repair changed since you opened it. Refresh and try again.' using errcode = 'PT409';
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
