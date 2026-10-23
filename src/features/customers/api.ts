import type { AppDatabase } from '@/lib/app-database.types';
import type { Tables } from '@/lib/database.types';
import { unwrap } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { blankToNull, type CustomerValues, type DeviceValues } from '@/features/validation';

export type Customer = AppDatabase['public']['Tables']['customers']['Row'];
export type Device = Tables<'devices'>;

export const PAGE_SIZE = 25;

export async function searchCustomers(query: string, offset = 0, limit = PAGE_SIZE): Promise<Customer[]> {
  return unwrap(
    await supabase.rpc('search_customers', { p_query: query, p_limit: limit, p_offset: offset }),
  );
}

export async function getCustomer(id: string): Promise<Customer> {
  return unwrap(await supabase.from('customers').select('*').eq('id', id).single());
}

export async function createCustomer(values: CustomerValues): Promise<Customer> {
  return unwrap(
    await supabase
      .from('customers')
      .insert({
        full_name: values.fullName.trim(),
        contact_number: values.contactNumber.trim(),
        address: blankToNull(values.address),
      })
      .select('*')
      .single(),
  );
}

export async function updateCustomer(id: string, values: CustomerValues): Promise<Customer> {
  return unwrap(
    await supabase
      .from('customers')
      .update({
        full_name: values.fullName.trim(),
        contact_number: values.contactNumber.trim(),
        address: blankToNull(values.address),
      })
      .eq('id', id)
      .select('*')
      .single(),
  );
}

export async function listDevices(customerId: string): Promise<Device[]> {
  return unwrap(
    await supabase.from('devices').select('*').eq('customer_id', customerId).order('created_at', { ascending: true }),
  );
}

export async function getDevice(id: string): Promise<Device> {
  return unwrap(await supabase.from('devices').select('*').eq('id', id).single());
}

function deviceColumns(values: DeviceValues) {
  return {
    device_type: values.deviceType.trim(),
    brand: values.brand.trim(),
    model: values.model.trim(),
  };
}

export async function createDevice(customerId: string, values: DeviceValues): Promise<Device> {
  return unwrap(
    await supabase
      .from('devices')
      .insert({ customer_id: customerId, ...deviceColumns(values) })
      .select('*')
      .single(),
  );
}

/** customer_id is not updatable (column grant), so a device can never be reassigned. */
export async function updateDevice(id: string, values: DeviceValues): Promise<Device> {
  return unwrap(await supabase.from('devices').update(deviceColumns(values)).eq('id', id).select('*').single());
}

export function deviceLabel(d: Pick<Device, 'brand' | 'model'>): string {
  return `${d.brand} ${d.model}`.trim();
}
