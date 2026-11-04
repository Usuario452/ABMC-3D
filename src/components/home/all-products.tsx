"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { loadProductsPage } from "@/actions/search"
import { ProductGrid } from "@/components/catalog/product-card"
import { ProductGridSkeleton } from "@/components/catalog/skeletons"
import { Button } from "@/components/ui/button"
import type { CatalogPage } from "@/types/catalog"

/**
 * Todos os produtos da home com rolagem infinita: começa com a primeira página vinda do servidor e,
 * quando o fim da lista se aproxima da tela, busca a próxima. Em caso de falha, oferece tentar de novo.
 */
export function AllProducts({ initial }: { initial: CatalogPage }) {
  const [products, setProducts] = useState(initial.products)
  const [page, setPage] = useState(initial.page)
  const [pageCount, setPageCount] = useState(initial.pageCount)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)

  const hasMore = page < pageCount

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    setFailed(false)
    const result = await loadProductsPage(page + 1)
    if (result.ok) {
      // Evita repetir um produto se o catálogo mudou entre uma página e outra.
      setProducts((current) => {
        const seen = new Set(current.map((product) => product.id))
        return [...current, ...result.products.filter((product) => !seen.has(product.id))]
      })
      setPage(result.page)
      setPageCount(result.pageCount)
    } else {
      setFailed(true)
    }
    loadingRef.current = false
    setLoading(false)
  }, [page])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore || failed) return
    const observer = new IntersectionObserver((entries) => entries[0]?.isIntersecting && loadMore(), {
      rootMargin: "600px 0px",
    })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, failed, loadMore])

  return (
    <>
      <ProductGrid products={products} />
      {loading ? (
        <div className="mt-3 sm:mt-4">
          <ProductGridSkeleton count={4} />
        </div>
      ) : null}
      {failed ? (
        <div className="mt-8 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">Não foi possível carregar mais produtos.</p>
          <Button variant="outline" size="sm" onClick={loadMore}>
            Tentar de novo
          </Button>
        </div>
      ) : null}
      {hasMore ? <div ref={sentinelRef} aria-hidden className="h-px" /> : null}
    </>
  )
}
