import Link from "next/link"
import type { ReactNode } from "react"
import type { IconType } from "react-icons"
import { BrandLogo } from "@/components/brand/brand-logo"
import { cn } from "@/lib/utils"

/**
 * Tela cheia para erros e páginas não encontradas, com o mesmo fundo do login (grade discreta e
 * brilhos dourados): logo no topo e, no centro, um destaque (código ou ícone), título, texto e ações.
 */
export function StatusScreen({
  icon: Icon,
  code,
  eyebrow,
  title,
  description,
  actions,
  footnote,
  role,
}: {
  icon: IconType
  /** Código grande no lugar do ícone (ex.: "404"). */
  code?: string
  /** Texto curto acima do título (ex.: "Erro inesperado"). */
  eyebrow: string
  title: string
  description: ReactNode
  actions: ReactNode
  /** Linha discreta abaixo das ações (ex.: código de referência do erro). */
  footnote?: ReactNode
  role?: "alert"
}) {
  return (
    <div className="relative flex min-h-dvh flex-1 flex-col overflow-hidden">
      <div aria-hidden className="bg-grid-faint absolute inset-0" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-gold/15 blur-3xl lg:h-[34rem] lg:w-[34rem]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -bottom-32 hidden h-96 w-96 rounded-full bg-gold-dark/10 blur-3xl lg:block"
      />

      <header className="relative flex justify-center py-8 lg:py-12">
        <Link href="/" aria-label="Página inicial" className="block w-40 xl:w-44">
          <BrandLogo />
        </Link>
      </header>

      <main role={role} className="relative flex flex-1 items-center justify-center px-6 pb-20">
        <div className="flex w-full max-w-md flex-col items-center text-center">
          {code ? (
            <p aria-hidden className="text-gold-gradient text-[5.5rem] leading-none font-bold tracking-tight sm:text-[7rem]">
              {code}
            </p>
          ) : (
            <span aria-hidden className="relative flex size-20 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-gold/15 [animation-duration:2.4s] motion-reduce:animate-none" />
              <span className="relative flex size-20 items-center justify-center rounded-full bg-card ring-1 ring-gold/30 shadow-panel">
                <Icon className="size-9 text-gold" />
              </span>
            </span>
          )}

          <p className={cn("text-xs font-semibold tracking-[0.2em] text-gold uppercase", code ? "mt-4" : "mt-8")}>{eyebrow}</p>
          <h1 className="mt-2 text-2xl font-bold text-balance sm:text-3xl">{title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-pretty text-muted-foreground">{description}</p>

          <div className="mt-8 flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-center">{actions}</div>

          {footnote ? <p className="mt-8 text-xs text-muted-foreground/80">{footnote}</p> : null}
        </div>
      </main>
    </div>
  )
}
