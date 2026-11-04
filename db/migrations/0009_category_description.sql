-- Descrição opcional da categoria (texto curto exibido na loja); nula quando não informada.

alter table public.categories add column description text;

alter table public.categories add constraint categories_description_length check (
  description is null or char_length(description) <= 300
);
