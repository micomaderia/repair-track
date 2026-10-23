/** Keep seeded contact placeholders out of normal customer lists. */
export function displayContact(value: string | null | undefined): string {
  if (!value || /^(DEMO|QA)-\d+$/i.test(value)) return 'Contact not provided';
  return value;
}

/** Only the known seeded shop label has a neutral display fallback. */
export function displayShopName(value: string | null | undefined): string {
  return !value || value === 'RepairTrack Demo Shop' ? 'RepairTrack' : value;
}

export function displayAddress(value: string | null | undefined): string | null {
  return !value || /^Demo Lane\b/.test(value) ? null : value;
}
