import Link from "next/link"
import { Suspense } from "react"
import { BrandLogo } from "@/components/brand/brand-logo"
import { CartButton } from "@/components/cart/cart-button"
import { CategoriesMenu } from "@/components/layout/categories-menu"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Button } from "@/components/ui/button"
import { siteConfig } from "@/config/site"
import { getActiveCategories } from "@/lib/data/catalog"
import { load } from "@/lib/data/load"

async function HeaderNavigation() {
  const result = await load(getActiveCategories)
  const categories = result.ok ? result.data : []

  return (
    <>
      <MobileNav categories={categories} />
      <div className="hidden md:block">
        <CategoriesMenu categories={categories} />
      </div>
    </>
  )
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="page-container flex h-16 items-center gap-2">
        <div className="flex items-center md:order-2">
          <Suspense fallback={<span className="size-10 md:hidden" aria-hidden />}>
            <HeaderNavigation />
          </Suspense>
        </div>

        <Link
          href="/"
          className="mr-auto rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:order-1 md:mr-4"
          aria-label={`${siteConfig.name} — página inicial`}
        >
          <BrandLogo className="w-36 sm:w-44" preload />
        </Link>

        <nav aria-label="Principal" className="hidden items-center md:order-3 md:mr-auto md:flex">
          <Button asChild variant="ghost" className="font-medium">
            <Link href="/catalogo">Catálogo</Link>
          </Button>
        </nav>

        <div className="md:order-4">
          <CartButton />
        </div>
      </div>
    </header>
  )
}
