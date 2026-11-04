import { siteConfig } from "@/config/site"
import { getSiteUrl } from "@/lib/env"

/**
 * Dados estruturados (schema.org, JSON-LD) das páginas da loja: ajudam o Google a mostrar preço,
 * disponibilidade, trilha de navegação e a busca do site nos resultados. As imagens usam o endereço fixo
 * /img/… (a URL assinada do R2 expira).
 */

type Crumb = { name: string; path: string }

/** Endereço absoluto a partir de um caminho do site ("/produtos/x" → "https://site/produtos/x"). */
export function absoluteUrl(path: string) {
  return new URL(path, `${getSiteUrl()}/`).toString()
}

/** Endereço fixo de uma imagem do bucket (foto de produto ou capa de categoria). */
export function fixedImageUrl(storagePath: string) {
  return absoluteUrl(`/img/${storagePath}`)
}

export function breadcrumbJsonLd(crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  }
}

/** Loja (Organization) e site com a busca interna (SearchAction), para a home. */
export function siteJsonLd() {
  const url = absoluteUrl("/")
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: siteConfig.name,
      url,
      logo: absoluteUrl("/icon.png"),
      description: siteConfig.seo.description,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: siteConfig.name,
      url,
      inLanguage: siteConfig.htmlLang,
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${absoluteUrl("/catalogo")}?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
  ]
}

export function productJsonLd(product: {
  id: string
  name: string
  slug: string
  description: string
  priceCents: number
  imagePaths: string[]
  categoryName: string | null
}) {
  const url = absoluteUrl(`/produtos/${product.slug}`)
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || siteConfig.seo.description,
    sku: product.id,
    url,
    image: product.imagePaths.slice(0, 6).map(fixedImageUrl),
    brand: { "@type": "Brand", name: siteConfig.name },
    ...(product.categoryName ? { category: product.categoryName } : {}),
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: siteConfig.currency,
      price: (product.priceCents / 100).toFixed(2),
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: siteConfig.name },
    },
  }
}

export function categoryJsonLd(category: { id: string; name: string; description: string | null; coverPath: string | null }) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: category.name,
    url: absoluteUrl(`/categorias/${category.id}`),
    ...(category.description ? { description: category.description } : {}),
    ...(category.coverPath ? { image: fixedImageUrl(category.coverPath) } : {}),
    isPartOf: { "@type": "WebSite", name: siteConfig.name, url: absoluteUrl("/") },
  }
}
