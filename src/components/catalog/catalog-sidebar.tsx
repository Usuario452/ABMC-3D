import Form from "next/form"
import Link from "next/link"
import type { ReactNode } from "react"
import { HiArrowRight, HiCheck } from "react-icons/hi2"
import { Input } from "@/components/ui/input"
import { buildCatalogHref } from "@/lib/catalog-url"
import { countActiveFilters, priceRangeLabel } from "@/lib/catalog-filters"
import { cn } from "@/lib/utils"
import type { CatalogFacets, CatalogQuery } from "@/types/catalog"

/**
 * Coluna de filtros da listagem (no estilo do Mercado Livre): categorias, faixas de preço com mínimo e
 * máximo, destaques e novidades, cada opção com a quantidade de produtos que traria. Tudo são links (ou um
 * formulário GET), então funciona sem JavaScript e cada combinação tem a própria URL.
 */
export function CatalogSidebar({ query, facets }: { query: CatalogQuery; facets: CatalogFacets }) {
  // Qualquer mudança volta para a primeira página.
  const href = (next: Partial<CatalogQuery>) => buildCatalogHref({ ...query, ...next, page: 1 })

  const hasPrice = query.minPrice !== null || query.maxPrice !== null
  const categories = facets.categories.filter(
    (category) => category.count > 0 || category.slug === query.category,
  )

  // Campos ocultos do formulário de preço: os demais filtros atuais, para não se perderem ao enviar.
  const priceParams = new URL(href({ minPrice: null, maxPrice: null }), "http://x").searchParams
  const activeCount = countActiveFilters(query)
  // Faixa real de preços dos produtos (com os demais filtros), em reais inteiros.
  const bounds = facets.priceBounds
    ? { min: Math.floor(facets.priceBounds.min / 100), max: Math.ceil(facets.priceBounds.max / 100) }
    : null

  return (
    <div className="space-y-7 text-sm">
      {activeCount > 0 ? (
        <Link href="/catalogo" className="inline-block font-medium text-gold hover:underline">
          Limpar filtros ({activeCount})
        </Link>
      ) : null}

      {categories.length > 0 ? (
        <FilterSection title="Categorias">
          <ul className="space-y-1">
            {categories.map((category) => {
              const selected = category.slug === query.category
              return (
                <li key={category.id}>
                  <FilterLink href={href({ category: selected ? "" : category.slug })} selected={selected} count={category.count}>
                    {category.name}
                  </FilterLink>
                </li>
              )
            })}
          </ul>
        </FilterSection>
      ) : null}

      <FilterSection title="Preço">
        {bounds ? (
          <p className="-mt-1 mb-2.5 text-xs text-muted-foreground">
            {bounds.min === bounds.max ? `Produtos por ${priceRangeLabel(bounds.min, bounds.min)}` : `De ${priceRangeLabel(bounds.min, bounds.max)}`}
          </p>
        ) : null}
        <ul className="space-y-1">
          {facets.priceRanges.map((range) => {
            const selected = query.minPrice === range.min && query.maxPrice === range.max
            if (range.count === 0 && !selected) return null
            return (
              <li key={`${range.min}-${range.max}`}>
                <FilterLink
                  href={selected ? href({ minPrice: null, maxPrice: null }) : href({ minPrice: range.min, maxPrice: range.max })}
                  selected={selected}
                  count={range.count}
                >
                  {priceRangeLabel(range.min, range.max)}
                </FilterLink>
              </li>
            )
          })}
        </ul>

        <Form action="/catalogo" className="mt-3 flex items-center gap-2" aria-label="Faixa de preço personalizada">
          {[...priceParams].map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <PriceInput
            name="preco-min"
            label="Mínimo"
            placeholder="Mín."
            defaultValue={query.minPrice}
          />
          <span className="text-muted-foreground" aria-hidden>
            –
          </span>
          <PriceInput
            name="preco-max"
            label="Máximo"
            placeholder="Máx."
            defaultValue={query.maxPrice}
          />
          <button
            type="submit"
            aria-label="Aplicar faixa de preço"
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-gold/15 text-gold transition-colors hover:bg-gold hover:text-black focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <HiArrowRight className="size-4" aria-hidden />
          </button>
        </Form>
        {hasPrice ? (
          <Link href={href({ minPrice: null, maxPrice: null })} className="mt-2 inline-block text-xs text-muted-foreground hover:text-foreground">
            Limpar preço
          </Link>
        ) : null}
      </FilterSection>

      <FilterSection title="Mais filtros">
        <ul className="space-y-1">
          <li>
            <ToggleLink href={href({ featured: !query.featured })} checked={query.featured} count={facets.featured} label="Destaques" />
          </li>
          <li>
            <ToggleLink href={href({ recent: !query.recent })} checked={query.recent} count={facets.recent} label="Novidades" />
          </li>
        </ul>
      </FilterSection>
    </div>
  )
}

function FilterSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2.5 text-[0.8125rem] font-semibold">{title}</h3>
      {children}
    </section>
  )
}

/** Opção de lista: nome e quantidade; a selecionada fica em negrito com um check dourado. */
function FilterLink({
  href,
  selected,
  count,
  children,
}: {
  href: string
  selected: boolean
  count: number
  children: ReactNode
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "flex items-center gap-2 rounded-lg py-1 transition-colors",
        selected ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {selected ? <HiCheck className="size-4 shrink-0 text-gold" aria-hidden /> : null}
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground/80">{count}</span>
    </Link>
  )
}

/** Opção liga/desliga com uma caixinha de marcação desenhada (é um link, não um checkbox de formulário). */
function ToggleLink({
  href,
  checked,
  count,
  label,
}: {
  href: string
  checked: boolean
  count: number
  label: string
}) {
  const disabled = count === 0 && !checked
  const content = (
    <>
      <span
        aria-hidden
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors",
          checked ? "border-gold bg-gold text-black" : "border-input bg-background",
        )}
      >
        {checked ? <HiCheck className="size-3" /> : null}
      </span>
      <span className="min-w-0 flex-1">{label}</span>
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground/80">{count}</span>
    </>
  )

  if (disabled) {
    return <span className="flex items-center gap-2.5 py-1 text-muted-foreground/50">{content}</span>
  }
  return (
    <Link
      href={href}
      scroll={false}
      role="checkbox"
      aria-checked={checked}
      aria-label={`${label} (${count})`}
      className={cn(
        "flex items-center gap-2.5 rounded-lg py-1 transition-colors",
        checked ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {content}
    </Link>
  )
}

function PriceInput({
  name,
  label,
  placeholder,
  defaultValue,
}: {
  name: string
  label: string
  placeholder: string
  defaultValue: number | null
}) {
  return (
    <label className="relative min-w-0 flex-1">
      <span className="sr-only">Preço {label.toLowerCase()} em reais</span>
      <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-xs text-muted-foreground" aria-hidden>
        R$
      </span>
      <Input
        name={name}
        type="number"
        inputMode="numeric"
        min={0}
        max={1000000}
        step={1}
        placeholder={placeholder}
        defaultValue={defaultValue ?? ""}
        // A key força o campo a recarregar o valor quando o filtro muda por um link.
        key={`${name}-${defaultValue ?? ""}`}
        className="h-9 [appearance:textfield] pr-2 pl-8 text-sm [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
    </label>
  )
}
