-- Liga carrinho e pedido à sessão do navegador (o mesmo session_id de site_visits), para o painel
-- contar carrinhos perdidos (sessão que adicionou itens e não enviou pedido) e a origem dos pedidos.
-- Identificador aleatório da aba, sem relação com pessoas. Eventos antigos ficam sem sessão (nulo).

alter table public.analytics_events add column session_id uuid;

create index analytics_events_session_idx on public.analytics_events (session_id) where session_id is not null;
