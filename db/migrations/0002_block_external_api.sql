-- Bloqueia o acesso às tabelas por APIs automáticas do provedor (ex.: a Data API/PostgREST
-- do Supabase, que expõe o esquema public com a chave pública).
--
-- RLS ativa e nenhuma política = nenhum outro papel lê ou grava nada. A aplicação conecta
-- como dona das tabelas (DATABASE_URL), e o dono não é afetado pela RLS — por isso não há
-- nenhuma mudança no app. Em um PostgreSQL puro (Neon, servidor próprio) também é inofensivo.

-- Criada também pelo scripts/db-migrate.mts; repetida aqui para o arquivo ser autossuficiente.
create table if not exists public.schema_migrations (
  name text primary key,
  applied_at timestamptz not null default now()
);

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.admin_users enable row level security;
alter table public.admin_sessions enable row level security;
alter table public.admin_login_attempts enable row level security;
alter table public.schema_migrations enable row level security;

revoke all on all tables in schema public from public;
revoke all on all sequences in schema public from public;
revoke execute on function public.reorder_product_images(uuid, uuid[]) from public;
revoke execute on function public.set_updated_at() from public;

-- Papéis de API de provedores (Supabase: anon e authenticated) recebem permissões
-- explícitas por padrão; remove-as quando existirem. Sem efeito em um Postgres puro.
do $$
declare
  api_role text;
begin
  foreach api_role in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = api_role) then
      execute format('revoke all on all tables in schema public from %I', api_role);
      execute format('revoke all on all sequences in schema public from %I', api_role);
      execute format('revoke all on all functions in schema public from %I', api_role);
      execute format('alter default privileges in schema public revoke all on tables from %I', api_role);
      execute format('alter default privileges in schema public revoke all on sequences from %I', api_role);
      execute format('alter default privileges in schema public revoke all on functions from %I', api_role);
    end if;
  end loop;
end;
$$;
