-- RepairTrack fictional demo data (idempotent).
-- Run from a trusted SQL session (postgres) after the demo owner auth user exists.
-- Every write goes through the same guarded RPCs the app uses, acting as the
-- demo owner via request.jwt.claims. Created ids are recorded in
-- private.demo_manifest; remove everything with: select private.remove_demo_data();
-- Contact fixtures are deliberately non-dialable (DEMO-000x).

begin;

do $$
declare
  v_owner uuid := (select id from auth.users where email = 'owner.repairtrack@example.com');
  r public.repair_transactions;
  rc public.receipts;
begin
  if v_owner is null then
    raise exception 'Demo owner auth user not found';
  end if;

  insert into public.profiles (id, display_name, is_active)
  values (v_owner, 'Shop Owner', true)
  on conflict (id) do update set is_active = true;

  insert into public.shop_settings (owner_id, shop_name, contact_number, address, receipt_footer)
  values (v_owner, 'RepairTrack Demo Shop', 'DEMO-0000', 'Bucot, Aliaga, Nueva Ecija',
          'Demo receipt for presentation only. Thank you!')
  on conflict (owner_id) do nothing;

  perform set_config('request.jwt.claims', json_build_object('sub', v_owner, 'role', 'authenticated')::text, true);

  -- Customers (fixed ids)
  insert into public.customers (id, owner_id, full_name, contact_number, address) values
    ('d0000000-0000-4000-8000-000000000c01', v_owner, 'Mara Villanueva', 'DEMO-0001', 'Demo Lane A, Bucot'),
    ('d0000000-0000-4000-8000-000000000c02', v_owner, 'Paolo Mendoza',   'DEMO-0002', 'Demo Lane B, Aliaga'),
    ('d0000000-0000-4000-8000-000000000c03', v_owner, 'Liza Santos',     'DEMO-0003', 'Demo Lane C, Bucot'),
    ('d0000000-0000-4000-8000-000000000c04', v_owner, 'Enzo Reyes',      'DEMO-0004', 'Demo Lane D, Aliaga'),
    ('d0000000-0000-4000-8000-000000000c05', v_owner, 'Bea Navarro',     'DEMO-0005', 'Demo Lane E, Bucot')
  on conflict (id) do nothing;

  -- Devices (Bea Navarro owns two)
  insert into public.devices (id, owner_id, customer_id, device_type, brand, model, serial_number) values
    ('d0000000-0000-4000-8000-000000000d01', v_owner, 'd0000000-0000-4000-8000-000000000c01', 'Laptop',  'Acer',   'Aspire 5',      'DEMO-A01'),
    ('d0000000-0000-4000-8000-000000000d02', v_owner, 'd0000000-0000-4000-8000-000000000c02', 'Desktop', 'ASUS',   'Custom Build',  'DEMO-A02'),
    ('d0000000-0000-4000-8000-000000000d03', v_owner, 'd0000000-0000-4000-8000-000000000c03', 'Laptop',  'Lenovo', 'IdeaPad 3',     'DEMO-A03'),
    ('d0000000-0000-4000-8000-000000000d04', v_owner, 'd0000000-0000-4000-8000-000000000c04', 'Laptop',  'Dell',   'Inspiron 15',   'DEMO-A04'),
    ('d0000000-0000-4000-8000-000000000d05', v_owner, 'd0000000-0000-4000-8000-000000000c05', 'Laptop',  'HP',     'Pavilion 14',   'DEMO-A05'),
    ('d0000000-0000-4000-8000-000000000d06', v_owner, 'd0000000-0000-4000-8000-000000000c05', 'Printer', 'Canon',  'PIXMA G2010',   'DEMO-A06')
  on conflict (id) do nothing;

  insert into private.demo_manifest (table_name, record_id)
  select 'customers', id from public.customers where id::text like 'd0000000-0000-4000-8000-000000000c0_'
  union all
  select 'devices', id from public.devices where id::text like 'd0000000-0000-4000-8000-000000000d0_'
  on conflict do nothing;

  -- 1. Pending: intermittent charging, estimate 1,200
  r := public.create_repair('d0000000-0000-4000-8000-0000000000a1', 'd0000000-0000-4000-8000-000000000c01',
       'd0000000-0000-4000-8000-000000000d01', 'Intermittent charging; battery icon flickers.', null, 120000, null,
       date_trunc('day', now()) - interval '1 day' + interval '2 hours', null, 'Charger left with device.');
  insert into private.demo_manifest values ('repair_transactions', r.id) on conflict do nothing;

  -- 2. In Progress: no display, estimate 2,500
  r := public.create_repair('d0000000-0000-4000-8000-0000000000a2', 'd0000000-0000-4000-8000-000000000c02',
       'd0000000-0000-4000-8000-000000000d02', 'No display on power on; fans spin.', null, 250000, null,
       date_trunc('day', now()) - interval '2 days' + interval '1 hour', null, null);
  insert into private.demo_manifest values ('repair_transactions', r.id) on conflict do nothing;
  if r.status = 'pending' then
    perform public.change_repair_status(r.id, 'pending', 'in_progress');
  end if;

  -- 3. Completed, unpaid: SSD replacement, final 3,000
  r := public.create_repair('d0000000-0000-4000-8000-0000000000a3', 'd0000000-0000-4000-8000-000000000c03',
       'd0000000-0000-4000-8000-000000000d03', 'Very slow boot; disk errors.', 'Replaced failing HDD with 512GB SSD; reinstalled OS.',
       280000, 300000, date_trunc('day', now()) - interval '3 days' + interval '1 hour', null, null);
  insert into private.demo_manifest values ('repair_transactions', r.id) on conflict do nothing;
  if r.status = 'pending' then
    perform public.change_repair_status(r.id, 'pending', 'in_progress');
    perform public.change_repair_status(r.id, 'in_progress', 'completed');
  end if;

  -- 4. Released, fully paid: keyboard replacement, final 1,800, Cash 1,800
  r := public.create_repair('d0000000-0000-4000-8000-0000000000a4', 'd0000000-0000-4000-8000-000000000c04',
       'd0000000-0000-4000-8000-000000000d04', 'Several keys not working.', 'Replaced keyboard assembly.',
       180000, 180000, date_trunc('day', now()) - interval '4 days' + interval '1 hour', null, null);
  insert into private.demo_manifest values ('repair_transactions', r.id) on conflict do nothing;
  if r.status = 'pending' then
    perform public.change_repair_status(r.id, 'pending', 'in_progress');
    perform public.change_repair_status(r.id, 'in_progress', 'completed');
  end if;
  rc := public.record_payment('d0000000-0000-4000-8000-0000000000b4', r.id, 180000, 'cash', null);
  insert into private.demo_manifest values ('receipts', rc.id), ('payments', rc.payment_id) on conflict do nothing;
  if (select status from public.repair_transactions where id = r.id) = 'completed' then
    perform public.change_repair_status(r.id, 'completed', 'released');
  end if;

  -- 5. In Progress, partial: board repair, final 5,000, GCash 2,000
  r := public.create_repair('d0000000-0000-4000-8000-0000000000a5', 'd0000000-0000-4000-8000-000000000c05',
       'd0000000-0000-4000-8000-000000000d05', 'Laptop shuts down when warm.', 'Board-level repair of power circuit in progress.',
       500000, 500000, date_trunc('day', now()) - interval '5 days' + interval '1 hour', null, null);
  insert into private.demo_manifest values ('repair_transactions', r.id) on conflict do nothing;
  if r.status = 'pending' then
    perform public.change_repair_status(r.id, 'pending', 'in_progress');
  end if;
  rc := public.record_payment('d0000000-0000-4000-8000-0000000000b5', r.id, 200000, 'gcash', 'DEMO-GC-0001');
  insert into private.demo_manifest values ('receipts', rc.id), ('payments', rc.payment_id) on conflict do nothing;
end;
$$;

commit;
