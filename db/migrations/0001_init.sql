-- ABMC 3D — esquema inicial (PostgreSQL puro, sem dependências de provedor)
-- Tabelas: categories, products, product_images, admin_users, admin_sessions, admin_login_attempts

-- ---------------------------------------------------------------------------
-- Função utilitária: atualização automática de updated_at
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_slug_key unique (slug),
  constraint categories_name_length check (char_length(btrim(name)) between 1 and 80),
  constraint categories_slug_format check (
    char_length(slug) between 1 and 100
    and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  )
);

comment on table public.categories is 'Categorias do catálogo ABMC 3D.';

create index categories_active_name_idx on public.categories (is_active, name);

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text not null default '',
  price_cents integer not null,
  -- Categoria obrigatória. "on delete restrict" impede excluir uma categoria
  -- que ainda possua produtos vinculados.
  category_id uuid not null references public.categories (id)
    on update cascade on delete restrict,
  is_active boolean not null default true,
  is_available boolean not null default true,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_slug_key unique (slug),
  constraint products_name_length check (char_length(btrim(name)) between 1 and 120),
  constraint products_slug_format check (
    char_length(slug) between 1 and 140
    and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  constraint products_description_length check (char_length(description) <= 5000),
  constraint products_price_non_negative check (price_cents >= 0)
);

comment on table public.products is 'Produtos do catálogo. Preços em centavos (BRL).';
comment on column public.products.price_cents is 'Preço em centavos de real. Ex.: 1990 = R$ 19,90.';
comment on column public.products.is_featured is 'Exibe o produto na seção de destaques da página inicial.';

create index products_category_id_idx on public.products (category_id);
create index products_public_listing_idx on public.products (is_active, is_available, name);
create index products_price_idx on public.products (price_cents);
create index products_featured_idx on public.products (created_at desc) where is_featured;

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- product_images
-- ---------------------------------------------------------------------------
create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  storage_path text not null,
  alt_text text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint product_images_storage_path_key unique (storage_path),
  -- O arquivo precisa estar na pasta do próprio produto: products/<product_id>/<arquivo>
  constraint product_images_storage_path_format check (
    storage_path like 'products/' || product_id::text || '/%'
    and storage_path ~ '^products/[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}$'
  ),
  constraint product_images_alt_text_length check (char_length(alt_text) <= 200),
  constraint product_images_position_non_negative check (position >= 0),
  -- Adiável para permitir reordenações (trocas de posição) em uma única transação.
  constraint product_images_product_position_key unique (product_id, position)
    deferrable initially deferred
);

comment on table public.product_images is 'Imagens dos produtos. position = 0 é a imagem principal.';

create index product_images_product_position_idx on public.product_images (product_id, position);

-- ---------------------------------------------------------------------------
-- Administradores do painel (login próprio da aplicação)
-- ---------------------------------------------------------------------------
create table public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  -- Formato: scrypt$N$r$p$<salt base64url>$<hash base64url> (src/lib/auth/password.ts)
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_users_email_key unique (email),
  constraint admin_users_email_format check (email = lower(btrim(email)) and email like '%_@_%')
);

comment on table public.admin_users is 'Administradores do painel. Criados com npm run db:create-admin.';

create trigger admin_users_set_updated_at
  before update on public.admin_users
  for each row execute function public.set_updated_at();

-- Sessões do painel. O cookie guarda um token aleatório; o banco guarda apenas o SHA-256 dele.
create table public.admin_sessions (
  token_hash text primary key,
  admin_id uuid not null references public.admin_users (id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index admin_sessions_admin_id_idx on public.admin_sessions (admin_id);
create index admin_sessions_expires_at_idx on public.admin_sessions (expires_at);

-- Tentativas de login com falha, para limitar ataques de força bruta.
create table public.admin_login_attempts (
  id bigint generated always as identity primary key,
  email text not null,
  created_at timestamptz not null default now()
);

create index admin_login_attempts_email_idx on public.admin_login_attempts (email, created_at desc);

-- ---------------------------------------------------------------------------
-- Reordena todas as imagens de um produto em uma única transação.
-- p_image_ids deve conter exatamente os IDs das imagens do produto, na nova ordem.
-- A primeira imagem da lista (position = 0) passa a ser a principal.
-- A autorização é verificada pela aplicação antes da chamada.
-- ---------------------------------------------------------------------------
create or replace function public.reorder_product_images(p_product_id uuid, p_image_ids uuid[])
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_total integer;
  v_given integer;
  v_distinct integer;
  v_matching integer;
begin
  select count(*) into v_total
  from public.product_images
  where product_id = p_product_id;

  v_given := coalesce(array_length(p_image_ids, 1), 0);

  select count(distinct t.id) into v_distinct
  from unnest(p_image_ids) as t(id);

  select count(*) into v_matching
  from public.product_images i
  where i.product_id = p_product_id
    and i.id = any (p_image_ids);

  if v_given <> v_total or v_distinct <> v_total or v_matching <> v_total then
    raise exception 'A lista de imagens não corresponde às imagens do produto.'
      using errcode = '22023';
  end if;

  update public.product_images i
  set position = t.ord - 1
  from unnest(p_image_ids) with ordinality as t(id, ord)
  where i.id = t.id
    and i.product_id = p_product_id;
end;
$$;
