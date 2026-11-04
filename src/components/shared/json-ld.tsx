/**
 * Insere dados estruturados (JSON-LD) na página. O texto é escapado para não fechar a tag <script> por
 * acidente (ex.: um "</script>" dentro da descrição de um produto).
 */
export function JsonLd({ data }: { data: unknown }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c")
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
}
