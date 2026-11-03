-- Capa opcional da categoria: caminho do arquivo no R2 (categories/<id>/<arquivo>.webp); nulo sem capa.

alter table public.categories add column cover_path text;

alter table public.categories add constraint categories_cover_path_format check (
  cover_path is null or cover_path ~ '^categories/[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}$'
);
