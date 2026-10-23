import { formatDateTime } from '../../lib/dates';
import { formatPeso } from '../../lib/money';
import { PAYMENT_METHOD_LABEL } from '../repairs/status';
import type { ReceiptSnapshot } from './snapshot';

export function escapeHtml(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const multiline = (value: string | null | undefined) => escapeHtml(value).replace(/\n/g, '<br />');

export function receiptStatusLabel(s: ReceiptSnapshot): string {
  return s.paymentStatus === 'paid' ? 'Paid' : 'Partial Payment';
}

/** A4-friendly HTML receipt built only from the stored snapshot. */
export function renderReceiptHtml(s: ReceiptSnapshot, logoSrc: string | null): string {
  const device = [s.device.deviceType, `${s.device.brand} ${s.device.model}`.trim()].filter(Boolean).join(' · ');
  const statusClass = s.paymentStatus === 'paid' ? 'paid' : 'partial';
  const row = (label: string, value: string, strong = false) =>
    `<tr${strong ? ' class="strong"' : ''}><th>${escapeHtml(label)}</th><td>${value}</td></tr>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(s.receiptNumber)}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Roboto, "Segoe UI", Helvetica, Arial, sans-serif; color: #13204A; margin: 0; font-size: 12.5pt; line-height: 1.45; }
  .sheet { max-width: 720px; margin: 0 auto; }
  header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; border-bottom: 2px solid #DCE2F2; padding-bottom: 16px; }
  .brand img { height: 44px; width: auto; }
  .brand .name { font-size: 20pt; font-weight: 700; color: #2753E0; }
  .shop { text-align: right; font-size: 10.5pt; color: #46527A; }
  .shop strong { display: block; color: #13204A; font-size: 13pt; }
  h1 { font-size: 15pt; margin: 22px 0 4px; }
  .meta { display: flex; flex-wrap: wrap; gap: 4px 28px; font-size: 10.5pt; color: #46527A; }
  .meta b { color: #13204A; font-variant-numeric: tabular-nums; }
  .status { display: inline-block; margin-top: 14px; padding: 6px 14px; border-radius: 999px; font-weight: 700; font-size: 11pt; }
  .status.partial { background: #FFF1D2; color: #875300; border: 1px solid #E8C77A; }
  .status.paid { background: #E0F4E9; color: #157347; border: 1px solid #8FCFAE; }
  section { margin-top: 20px; }
  h2 { font-size: 11pt; color: #46527A; margin: 0 0 6px; }
  .amount { margin-top: 18px; padding: 16px; background: #F4F6FC; border-radius: 12px; }
  .amount strong { display: block; font-size: 26pt; font-variant-numeric: tabular-nums; }
  @media print { .amount { background: white; border: 1px solid #DCE2F2; } }
  .box { border: 1px solid #DCE2F2; border-radius: 10px; padding: 12px 14px; page-break-inside: avoid; }
  .box p { margin: 2px 0; word-wrap: break-word; overflow-wrap: anywhere; }
  table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
  th, td { padding: 7px 0; border-bottom: 1px solid #EEF1F8; font-weight: 400; }
  th { text-align: left; color: #46527A; }
  td { text-align: right; }
  tr.strong th, tr.strong td { font-weight: 700; color: #13204A; font-size: 13.5pt; border-bottom: 2px solid #DCE2F2; }
  footer { margin-top: 28px; font-size: 10pt; color: #5F6A8E; text-align: center; }
  .note { margin-top: 6px; font-size: 9pt; }
</style>
</head>
<body>
<div class="sheet">
  <header>
    <div class="brand">${logoSrc ? `<img src="${logoSrc}" alt="RepairTrack" />` : '<div class="name">RepairTrack</div>'}</div>
    <div class="shop">
      <strong>${escapeHtml(s.shop.name)}</strong>
      ${s.shop.address ? `${multiline(s.shop.address)}<br />` : ''}
      ${s.shop.contactNumber ? escapeHtml(s.shop.contactNumber) : ''}
    </div>
  </header>

  <h1>Payment Receipt</h1>
  <div class="meta">
    <span>Receipt No. <b>${escapeHtml(s.receiptNumber)}</b></span>
    <span>Repair No. <b>${escapeHtml(s.transactionNumber)}</b></span>
    <span>Issued <b>${escapeHtml(formatDateTime(s.issuedAt))}</b></span>
  </div>
  <div class="status ${statusClass}">${receiptStatusLabel(s)}</div>
  <div class="amount">Payment amount<strong>${formatPeso(s.paymentAmountCentavos)}</strong>Remaining balance: ${formatPeso(s.balanceCentavos)}</div>

  <section>
    <h2>Customer</h2>
    <div class="box">
      <p><b>${escapeHtml(s.customer.fullName)}</b></p>
      ${s.customer.contactNumber ? `<p>${escapeHtml(s.customer.contactNumber)}</p>` : ''}
    </div>
  </section>
  <section><h2>Device</h2><p>${escapeHtml(device)}</p></section>

  <section>
    <h2>${escapeHtml(s.serviceLabel)}</h2>
    <div class="box"><p>${multiline(s.serviceText) || '—'}</p></div>
  </section>

  <section>
    <h2>Payment</h2>
    <table>
      ${row('Estimated amount', 'Not recorded on receipt')}
      ${row('Final repair amount', formatPeso(s.finalAmountCentavos))}
      ${row('Amount paid (this receipt)', formatPeso(s.paymentAmountCentavos), true)}
      ${row('Payment method', escapeHtml(PAYMENT_METHOD_LABEL[s.paymentMethod]) + (s.paymentReference ? ` · Ref ${escapeHtml(s.paymentReference)}` : ''))}
      ${row('Total paid to date', formatPeso(s.totalPaidCentavos))}
      ${row('Remaining balance', formatPeso(s.balanceCentavos))}
      ${row('Payment status', receiptStatusLabel(s))}
    </table>
  </section>

  <footer>
    ${s.shop.receiptFooter ? `<div>${multiline(s.shop.receiptFooter)}</div>` : '<div>Thank you for your payment.</div>'}
    ${s.operatorName ? `<div class="note">Received by ${escapeHtml(s.operatorName)}</div>` : ''}
    <div class="note">Generated by RepairTrack · Service payment acknowledgment</div>
  </footer>
</div>
</body>
</html>`;
}
