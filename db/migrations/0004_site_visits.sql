-- Visitas à vitrine: uma linha por página vista, para o painel "Visitantes" (fluxo, origem, região, dispositivo).
-- Sem IP: a região vem dos cabeçalhos de geolocalização da hospedagem (país, estado e cidade).
-- visitor_id e session_id são identificadores aleatórios gerados no navegador, sem relação com pessoas.

create table public.site_visits (
  id bigint generated always as identity primary key,
  visitor_id uuid not null,
  session_id uuid not null,
  path text not null,
  -- Primeira página da sessão (entrada) e primeira visita deste navegador.
  is_entry boolean not null default false,
  is_new_visitor boolean not null default false,
  -- Origem: só o domínio de quem enviou o visitante, mais os parâmetros UTM da entrada.
  referrer_host text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  country text,
  region text,
  city text,
  device text not null default 'other',
  browser text,
  os text,
  created_at timestamptz not null default now(),
  constraint site_visits_path_check check (path like '/%' and char_length(path) <= 300),
  constraint site_visits_device_check check (device in ('desktop', 'mobile', 'tablet', 'other'))
);

comment on table public.site_visits is 'Páginas vistas da vitrine, sem dados pessoais (veja o cabeçalho da migration).';

create index site_visits_created_idx on public.site_visits (created_at);
create index site_visits_session_idx on public.site_visits (session_id, created_at);
create index site_visits_visitor_idx on public.site_visits (visitor_id, created_at);

-- Mesmo bloqueio das outras tabelas: nenhuma API automática do provedor enxerga esta tabela.
alter table public.site_visits enable row level security;
revoke all on public.site_visits from public;

do $$
declare
  api_role text;
begin
  foreach api_role in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = api_role) then
      execute format('revoke all on public.site_visits from %I', api_role);
    end if;
  end loop;
end;
$$;
