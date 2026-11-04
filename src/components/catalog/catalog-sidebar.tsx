import Form from "next/form"
import Link from "next/link"
import type { ReactNode } from "react"
import { HiArrowRight, HiCheck, HiOutlineAdjustmentsHorizontal, HiOutlineSparkles, HiOutlineStar } from "react-icons/hi2"
import type { IconType } from "react-icons"
import { CatalogSort } from "@/components/catalog/catalog-sort"
import { buildCatalogHref } from "@/lib/catalog-url"
import { countActiveFilters, priceRangeLabel } from "@/lib/catalog-filters"
import { cn } from "@/lib/utils"
import type { CatalogFacets, CatalogQuery } from "@/types/catalog"

/**
 * Coluna de filtros do catálogo (no estilo do Mercado Livre): ordenação, categorias, faixas de preço com
 * mínimo e máximo, destaques e novidades, cada opção com a quantidade de produtos que traria. Seções
 * separadas por linhas finas; opções em linhas com fundo no hover e a escolhida em dourado claro. Tudo são
 * links (ou um formulário GET), então funciona sem JavaScript e cada combinação tem a própria URL.
 */
export function CatalogSidebar({
  query,
  facets,
  showHeader = true,
}: {
  query: CatalogQuery
  facets: CatalogFacets
  /** Cabeçalho "Filtros" com "Limpar"; a gaveta do celular tem o próprio título e não mostra. */
  showHeader?: boolean
}) {
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
  const priceRanges = facets.priceRanges.filter(
    (range) => range.count > 0 || (query.minPrice === range.min && query.maxPrice === range.max),
  )

  const clearLink =
    activeCount > 0 ? (
      <Link href="/catalogo" className="text-xs font-medium text-gold hover:underline">
        Limpar ({activeCount})
      </Link>
    ) : null

  return (
    <div className="text-sm">
      {showHeader ? (
        <div className="flex items-center justify-between gap-2 pb-4">
          <h2 className="inline-flex items-center gap-2 text-base font-semibold">
            <HiOutlineAdjustmentsHorizontal className="size-5 text-gold" aria-hidden />
            Filtros
          </h2>
          {clearLink}
        </div>
      ) : clearLink ? (
        <div className="pb-3">{clearLink}</div>
      ) : null}

      <div className="divide-y divide-border">
        <FilterSection title="Ordenar por" first>
          <CatalogSort query={query} />
        </FilterSection>

        {categories.length > 0 ? (
          <FilterSection title="Categorias">
            <ul className="-mx-2 space-y-0.5">
              {categories.map((category) => {
                const selected = category.slug === query.category
                return (
                  <li key={category.id}>
                    <OptionLink
                      href={href({ category: selected ? "" : category.slug })}
                      selected={selected}
                      count={category.count}
                    >
                      {category.name}
                    </OptionLink>
                  </li>
                )
              })}
            </ul>
          </FilterSection>
        ) : null}

        <FilterSection
          title="Preço"
          aside={
            bounds ? (
              <span className="text-xs text-muted-foreground">
                {bounds.min === bounds.max ? priceRangeLabel(bounds.min, bounds.min) : priceRangeLabel(bounds.min, bounds.max)}
              </span>
            ) : null
          }
        >
          {priceRanges.length > 0 ? (
            <ul className="mb-3 flex flex-wrap gap-1.5">
              {priceRanges.map((range) => {
                const selected = query.minPrice === range.min && query.maxPrice === range.max
                return (
                  <li key={`${range.min}-${range.max}`}>
                    <Link
                      href={selected ? href({ minPrice: null, maxPrice: null }) : href({ minPrice: range.min, maxPrice: range.max })}
                      scroll={false}
                      aria-current={selected ? "true" : undefined}
                      className={cn(
                        "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs font-medium transition-colors",
                        selected
                          ? "border-gold bg-gold/15 text-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-gold/50 hover:text-foreground",
                      )}
                    >
                      {selected ? <HiCheck className="size-3.5 text-gold" aria-hidden /> : null}
                      {priceRangeLabel(range.min, range.max)}
                    </Link>
                  </li>
                )
              })}
            </ul>
          ) : null}

          {/* Mínimo e máximo num campo só, com a seta de aplicar embutida. */}
          <Form
            action="/catalogo"
            aria-label="Faixa de preço personalizada"
            className="flex h-10 items-center rounded-xl border border-input bg-background pl-1 transition-colors focus-within:border-gold/60 focus-within:ring-3 focus-within:ring-ring/20"
          >
            {[...priceParams].map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            <PriceInput name="preco-min" label="Mínimo" placeholder="Mín." defaultValue={query.minPrice} />
            <span aria-hidden className="h-5 w-px shrink-0 bg-border" />
            <PriceInput name="preco-max" label="Máximo" placeholder="Máx." defaultValue={query.maxPrice} />
            <button
              type="submit"
              aria-label="Aplicar faixa de preço"
              className="mr-1 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-gold text-black transition-colors hover:bg-gold-light focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <HiArrowRight className="size-4" aria-hidden />
            </button>
          </Form>
          {hasPrice ? (
            <Link
              href={href({ minPrice: null, maxPrice: null })}
              scroll={false}
              className="mt-2 inline-block text-xs text-muted-foreground hover:text-foreground"
            >
              Limpar preço
            </Link>
          ) : null}
        </FilterSection>

        <FilterSection title="Mais filtros">
          <ul className="-mx-2 space-y-0.5">
            <li>
              <ToggleLink
                href={href({ featured: !query.featured })}
                checked={query.featured}
                count={facets.featured}
                label="Destaques"
                icon={HiOutlineStar}
              />
            </li>
            <li>
              <ToggleLink
                href={href({ recent: !query.recent })}
                checked={query.recent}
                count={facets.recent}
                label="Novidades"
                icon={HiOutlineSparkles}
              />
            </li>
          </ul>
        </FilterSection>
      </div>
    </div>
  )
}

function FilterSection({
  title,
  aside,
  first = false,
  children,
}: {
  title: string
  aside?: ReactNode
  first?: boolean
  children: ReactNode
}) {
  return (
    <section className={first ? "pb-5" : "py-5 last:pb-0"}>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="text-[0.7rem] font-semibold tracking-[0.08em] text-muted-foreground uppercase">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  )
}

/** Quantidade de uma opção, num selinho discreto (dourado quando a opção está escolhida). */
function Count({ value, active = false }: { value: number; active?: boolean }) {
  return (
    <span
      className={cn(
        "min-w-6 shrink-0 rounded-full px-1.5 text-center text-[0.7rem] leading-5 font-medium tabular-nums",
        active ? "bg-gold text-black" : "bg-muted text-muted-foreground",
      )}
    >
      {value}
    </span>
  )
}

/** Opção de lista: linha com fundo no hover; a escolhida fica em dourado claro, em negrito e com check. */
function OptionLink({
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
        "flex h-9 items-center gap-2 rounded-lg px-2 transition-colors",
        selected ? "bg-gold/12 font-semibold text-foreground" : "text-foreground/80 hover:bg-muted hover:text-foreground",
      )}
    >
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {selected ? <HiCheck className="size-4 shrink-0 text-gold" aria-hidden /> : null}
      <Count value={count} active={selected} />
    </Link>
  )
}

/** Opção liga/desliga: ícone, nome, quantidade e uma chave à direita (é um link, não um checkbox de formulário). */
function ToggleLink({
  href,
  checked,
  count,
  label,
  icon: Icon,
}: {
  href: string
  checked: boolean
  count: number
  label: string
  icon: IconType
}) {
  const disabled = count === 0 && !checked
  const content = (
    <>
      <Icon className={cn("size-4 shrink-0", checked ? "text-gold" : "text-muted-foreground")} aria-hidden />
      <span className="min-w-0 flex-1">{label}</span>
      <Count value={count} active={checked} />
      <span
        aria-hidden
        className={cn(
          "relative h-5 w-8 shrink-0 rounded-full transition-colors",
          checked ? "bg-gold" : "bg-input",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-4 rounded-full bg-white shadow-sm transition-[left]",
            checked ? "left-3.5" : "left-0.5",
          )}
        />
      </span>
    </>
  )

  if (disabled) {
    return <span className="flex h-9 items-center gap-2.5 px-2 text-muted-foreground/50 [&_*]:opacity-70">{content}</span>
  }
  return (
    <Link
      href={href}
      scroll={false}
      role="switch"
      aria-checked={checked}
      aria-label={`${label} (${count})`}
      className={cn(
        "flex h-9 items-center gap-2.5 rounded-lg px-2 transition-colors",
        checked ? "font-medium text-foreground" : "text-foreground/80 hover:bg-muted hover:text-foreground",
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
    <label className="relative flex h-full min-w-0 flex-1 items-center">
      <span className="sr-only">Preço {label.toLowerCase()} em reais</span>
      <span className="pointer-events-none pl-2 text-xs text-muted-foreground" aria-hidden>
        R$
      </span>
      <input
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
        className="h-full w-full min-w-0 [appearance:textfield] bg-transparent px-1.5 text-sm outline-none placeholder:text-muted-foreground/70 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
    </label>
  )
}
