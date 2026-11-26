-- Amount the sender paid, in USDT. Staff only: printed on the receipt,
-- never returned by the public tracking function.
alter table public.shipments
  add column if not exists amount_paid_usdt numeric(14,2)
  check (amount_paid_usdt is null or (amount_paid_usdt >= 0 and amount_paid_usdt < 1000000000));
comment on column public.shipments.amount_paid_usdt is 'Amount the sender paid, in USDT. Staff only; printed on the receipt, never shown on public tracking.';
