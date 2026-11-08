import { ProductGrid } from "@/components/catalog/product-card"
import { OpenCartLink } from "@/components/cart/open-cart-link"
import { getPreviewCartProducts, getPreviewProductDetail } from "@/lib/preview-cart-products"

export function PreviewCartProducts() {
  const products = getPreviewCartProducts()
  if (!products.length) return null

  return (
    <section className="mb-10" aria-labelledby="preview-cart-title">
      <h2 id="preview-cart-title" className="text-xl font-semibold">Produtos de teste · Preview</h2>
      <p className="mt-2 text-sm text-muted-foreground">Exemplos fictícios para testar o carrinho. Não geram pedidos.</p>
      <div className="mt-5 max-w-3xl">
        <ProductGrid products={products.map((product) => getPreviewProductDetail(product.slug)!)} columns="grid-cols-2" />
      </div>
      <OpenCartLink className="mt-4 inline-flex min-h-11 items-center font-medium underline underline-offset-4">Ver carrinho</OpenCartLink>
    </section>
  )
}
