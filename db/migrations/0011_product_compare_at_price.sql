-- Preço original ("de"), exibido riscado ao lado do preço atual quando o produto está com desconto.
-- Nulo quando não há desconto. Sempre maior que o preço atual (price_cents), que é o valor cobrado.

alter table public.products add column compare_at_price_cents integer;

alter table public.products add constraint products_compare_at_price_check check (
  compare_at_price_cents is null or compare_at_price_cents > price_cents
);

comment on column public.products.compare_at_price_cents is
  'Preço original em centavos, exibido riscado (desconto). Nulo sem desconto; maior que price_cents.';
