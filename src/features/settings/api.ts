import type { Tables } from '@/lib/database.types';
import { unwrap } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { blankToNull, type ShopSettingsValues } from '@/features/validation';

export type Profile = Tables<'profiles'>;
export type ShopSettings = Tables<'shop_settings'>;

export async function getProfile(userId: string): Promise<Profile | null> {
  return unwrap(await supabase.from('profiles').select('*').eq('id', userId).maybeSingle());
}

export async function getShopSettings(): Promise<ShopSettings | null> {
  return unwrap(await supabase.from('shop_settings').select('*').maybeSingle());
}

export async function saveSettings(userId: string, values: ShopSettingsValues): Promise<void> {
  const [profile, shop] = await Promise.all([
    supabase.from('profiles').update({ display_name: values.displayName.trim() }).eq('id', userId).select('id').single(),
    supabase
      .from('shop_settings')
      .update({
        shop_name: values.shopName.trim(),
        contact_number: blankToNull(values.contactNumber),
        address: blankToNull(values.address),
        receipt_footer: blankToNull(values.receiptFooter),
      })
      .eq('owner_id', userId)
      .select('owner_id')
      .single(),
  ]);
  unwrap(profile);
  unwrap(shop);
}
