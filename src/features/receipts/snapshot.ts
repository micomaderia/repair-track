import type { Json } from '../../lib/database.types';
import type { PaymentMethod } from '../repairs/status';

/** Immutable receipt content captured by the server at issue time (template v1). */
export type ReceiptSnapshot = {
  templateVersion: number;
  receiptNumber: string;
  transactionNumber: string;
  issuedAt: string;
  shop: { name: string; contactNumber: string | null; address: string | null; receiptFooter: string | null };
  operatorName: string | null;
  customer: { fullName: string; contactNumber: string | null };
  device: { deviceType: string; brand: string; model: string; serialNumber: string | null };
  serviceLabel: string;
  serviceText: string;
  finalAmountCentavos: number;
  paymentAmountCentavos: number;
  totalPaidCentavos: number;
  balanceCentavos: number;
  paymentMethod: PaymentMethod;
  paymentReference: string | null;
  paymentStatus: 'partial' | 'paid';
};

type Obj = Record<string, Json | undefined>;

const isObj = (v: Json | undefined): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: Json | undefined): string | null => (typeof v === 'string' ? v : null);
const num = (v: Json | undefined): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

export function parseReceiptSnapshot(raw: Json): ReceiptSnapshot | null {
  if (!isObj(raw)) return null;
  const shop = isObj(raw.shop) ? raw.shop : {};
  const customer = isObj(raw.customer) ? raw.customer : {};
  const device = isObj(raw.device) ? raw.device : {};
  const method = str(raw.payment_method);
  const receiptNumber = str(raw.receipt_number);
  const transactionNumber = str(raw.transaction_number);
  if (!receiptNumber || !transactionNumber || (method !== 'cash' && method !== 'gcash' && method !== 'bank_transfer')) {
    return null;
  }
  return {
    templateVersion: num(raw.template_version) || 1,
    receiptNumber,
    transactionNumber,
    issuedAt: str(raw.issued_at) ?? '',
    shop: {
      name: str(shop.name) ?? 'RepairTrack',
      contactNumber: str(shop.contact_number),
      address: str(shop.address),
      receiptFooter: str(shop.receipt_footer),
    },
    operatorName: str(raw.operator_name),
    customer: { fullName: str(customer.full_name) ?? '—', contactNumber: str(customer.contact_number) },
    device: {
      deviceType: str(device.device_type) ?? '',
      brand: str(device.brand) ?? '',
      model: str(device.model) ?? '',
      serialNumber: str(device.serial_number),
    },
    serviceLabel: str(raw.service_label) ?? 'Service / Diagnosis',
    serviceText: str(raw.service_text) ?? '',
    finalAmountCentavos: num(raw.final_amount_centavos),
    paymentAmountCentavos: num(raw.payment_amount_centavos),
    totalPaidCentavos: num(raw.total_paid_centavos),
    balanceCentavos: num(raw.balance_centavos),
    paymentMethod: method,
    paymentReference: str(raw.payment_reference),
    paymentStatus: str(raw.payment_status) === 'paid' ? 'paid' : 'partial',
  };
}
