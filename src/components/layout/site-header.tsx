import Link from "next/link"
import { Suspense } from "react"
import { BrandLogo } from "@/components/brand/brand-logo"
import { CartButton } from "@/components/cart/cart-button"
import { CartDrawer } from "@/components/cart/cart-drawer"
import { HeaderCategories, HeaderSearch } from "@/components/layout/header-nav"
import { HeaderShell } from "@/components/layout/header-shell"
import { siteConfig } from "@/config/site"
import { getActiveCategories } from "@/lib/data/catalog"
import { load } from "@/lib/data/load"

/** Categorias do banco (em cache); até chegarem, o lugar do botão fica vazio. */
async function CategoriesSlot() {
  const result = await load(getActiveCategories)
  return <HeaderCategories categories={result.ok ? result.data : []} />
}

/**
 * Cabeçalho da loja: estacionado no hero da home e barra ativa ao rolar. Marca à esquerda; categorias,
 * busca e carrinho à direita.
 */
export function SiteHeader() {
  return (
    <HeaderShell>
      <Link
        href="/"
        className="mr-auto rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        aria-label={`${siteConfig.name} — página inicial`}
      >
        <BrandLogo className="w-32 sm:w-40" preload onDark />
      </Link>
      <div className="flex items-center gap-1 sm:gap-2">
        <Suspense fallback={null}>
          <CategoriesSlot />
        </Suspense>
        <HeaderSearch />
        <CartButton />
      </div>
      <CartDrawer />
    </HeaderShell>
  )
}
