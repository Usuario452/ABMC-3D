-- Anotação interna do produto: lembretes do dono (origem do modelo, ajustes de impressão etc.).
-- Só o painel lê esta coluna; a vitrine seleciona as colunas uma a uma e nunca a expõe.

alter table public.products add column internal_notes text not null default '';

alter table public.products add constraint products_internal_notes_length check (char_length(internal_notes) <= 2000);
