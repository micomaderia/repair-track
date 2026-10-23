-- Covering index for the composite receipts -> payments foreign key.
create index receipts_payment_fk_idx on public.receipts (owner_id, repair_id, payment_id);
