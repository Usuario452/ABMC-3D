-- Eventos de uso da vitrine, para o painel de visão geral (visualizações, carrinho e pedidos).
-- Sem dados pessoais: guarda só o tipo do evento, o produto e valores.

create table public.analytics_events (
  id bigint generated always as identity primary key,
  type text not null,
  -- Produto do evento. Se o produto for excluído o histórico permanece (product_id vira nulo).
  product_id uuid references public.products (id) on delete set null,
  quantity integer not null default 1,
  value_cents integer not null default 0,
  -- Agrupa as linhas de um mesmo pedido (só em checkout_whatsapp).
  order_ref uuid,
  created_at timestamptz not null default now(),
  constraint analytics_events_type_check check (type in ('product_view', 'add_to_cart', 'checkout_whatsapp')),
  constraint analytics_events_quantity_check check (quantity between 1 and 99),
  constraint analytics_events_value_check check (value_cents >= 0)
);

comment on table public.analytics_events is 'Eventos anônimos da vitrine: visualização de produto, item no carrinho e pedido enviado.';

create index analytics_events_created_idx on public.analytics_events (created_at);
create index analytics_events_type_created_idx on public.analytics_events (type, created_at);
create index analytics_events_product_idx on public.analytics_events (product_id) where product_id is not null;

-- Mesmo bloqueio das outras tabelas: nenhuma API automática do provedor enxerga esta tabela.
alter table public.analytics_events enable row level security;
revoke all on public.analytics_events from public;

do $$
declare
  api_role text;
begin
  foreach api_role in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = api_role) then
      execute format('revoke all on public.analytics_events from %I', api_role);
    end if;
  end loop;
end;
$$;
