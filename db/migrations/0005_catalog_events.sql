-- Buscas e categorias vistas no catálogo, para o painel saber o que as pessoas procuram
-- (inclusive o que pesquisam e não encontram). Sem dados pessoais.

create table public.catalog_events (
  id bigint generated always as identity primary key,
  type text not null,
  visitor_id uuid,
  session_id uuid,
  -- Texto buscado, em minúsculas e sem espaços sobrando (só em type = 'search').
  query text,
  -- Categoria filtrada no momento (slug, sem vínculo: o histórico sobrevive à exclusão da categoria).
  category_slug text,
  -- Quantos produtos a busca devolveu; 0 = a pessoa não encontrou o que procurava.
  results_count integer,
  created_at timestamptz not null default now(),
  constraint catalog_events_type_check check (type in ('search', 'category_view')),
  constraint catalog_events_query_length check (query is null or char_length(query) <= 100),
  constraint catalog_events_results_check check (results_count is null or results_count >= 0)
);

comment on table public.catalog_events is 'Buscas (com número de resultados) e categorias abertas no catálogo.';

create index catalog_events_created_idx on public.catalog_events (created_at);
create index catalog_events_type_created_idx on public.catalog_events (type, created_at);

-- Mesmo bloqueio das outras tabelas: nenhuma API automática do provedor enxerga esta tabela.
alter table public.catalog_events enable row level security;
revoke all on public.catalog_events from public;

do $$
declare
  api_role text;
begin
  foreach api_role in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = api_role) then
      execute format('revoke all on public.catalog_events from %I', api_role);
    end if;
  end loop;
end;
$$;
