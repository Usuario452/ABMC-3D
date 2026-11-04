import type { MetadataRoute } from "next"
import { getShowcaseCategories, getSitemapEntries } from "@/lib/data/catalog"
import { getSiteUrl, isDatabaseConfigured } from "@/lib/env"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl()
  const pages: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/catalogo`, changeFrequency: "daily", priority: 0.9 },
  ]

  if (!isDatabaseConfigured()) return pages

  const [products, categories] = await Promise.all([getSitemapEntries(), getShowcaseCategories()])
  if (!products.ok) return pages

  return [
    ...pages,
    ...(categories.ok
      ? categories.data.map((category) => ({
          url: `${siteUrl}/categorias/${category.id}`,
          changeFrequency: "weekly" as const,
          priority: 0.7,
        }))
      : []),
    ...products.data.map((product) => ({
      url: `${siteUrl}/produtos/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ]
}
