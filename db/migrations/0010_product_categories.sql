-- Um produto pode estar em várias categorias (ex.: "Chaveiro" e "Personalizados"), todas com o mesmo peso.
--
-- product_categories guarda todas as categorias do produto, na ordem escolhida (position). A coluna
-- products.category_id continua existindo como a primeira dessa lista: é o rótulo exibido no card e no
-- caminho do produto, e é mantida pela aplicação ao salvar.
--
-- Regras na loja: o produto aparece no filtro de qualquer uma das suas categorias ativas e só some se
-- todas elas estiverem inativas.

create table public.product_categories (
  product_id uuid not null references public.products (id) on delete cascade,
  -- "restrict": não dá para excluir uma categoria que ainda tem produtos vinculados.
  category_id uuid not null references public.categories (id) on update cascade on delete restrict,
  position smallint not null default 0,
  primary key (product_id, category_id),
  constraint product_categories_position_range check (position between 0 and 49)
);

comment on table public.product_categories is 'Categorias de cada produto (muitas para muitas), na ordem escolhida.';

create index product_categories_category_idx on public.product_categories (category_id);

-- Todos os produtos atuais entram na categoria que já tinham.
insert into public.product_categories (product_id, category_id, position)
select id, category_id, 0 from public.products;

-- Mesma proteção das outras tabelas (ver 0002): sem acesso pelas APIs automáticas do provedor.
alter table public.product_categories enable row level security;
revoke all on public.product_categories from public;

do $$
declare
  api_role text;
begin
  foreach api_role in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = api_role) then
      execute format('revoke all on public.product_categories from %I', api_role);
    end if;
  end loop;
end
$$;
