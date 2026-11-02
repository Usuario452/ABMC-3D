import { isProductImagePath } from "@/lib/images"
import { getObject } from "@/lib/r2"

/**
 * Imagem de produto em endereço fixo (/img/products/<produto>/<arquivo>), lida do bucket privado.
 * Usada onde o link precisa durar para sempre, como a prévia ao compartilhar um produto no WhatsApp;
 * nas páginas, as imagens usam a URL assinada. Os arquivos são imutáveis, então o cache é de 1 ano.
 */
export async function GET(_request: Request, { params }: RouteContext<"/img/[...path]">) {
  const key = (await params).path.join("/")
  if (!isProductImagePath(key)) return new Response(null, { status: 404 })

  const object = await getObject(key)
  if (!object?.body) return new Response(null, { status: 404 })

  return new Response(object.body, {
    headers: {
      "Content-Type": object.headers.get("Content-Type") ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
