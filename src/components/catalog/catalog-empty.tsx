import type { ReactNode } from "react"
import type { IconType } from "react-icons"

/**
 * Estado vazio da listagem, solto sobre o fundo da página (sem card): ilustração de ícone em camadas (um
 * quadro dourado inclinado atrás, o quadro claro com o ícone na frente e um selo redondo no canto), título,
 * texto e ações (e, se passado, conteúdo extra embaixo).
 */
export function CatalogEmpty({
  icon: Icon,
  badge: Badge,
  title,
  description,
  actions,
  children,
}: {
  icon: IconType
  /** Ícone pequeno do selo no canto da ilustração (ex.: um "x" para "nada encontrado"). */
  badge?: IconType
  title: string
  description: ReactNode
  actions?: ReactNode
  /** Conteúdo extra abaixo do estado vazio. */
  children?: ReactNode
}) {
  return (
    <div className="space-y-12">
      <div className="px-2 py-10 text-center sm:py-14">
        <div className="mx-auto flex max-w-md flex-col items-center">
          <div aria-hidden className="relative size-20">
            <span className="absolute inset-1 -rotate-12 rounded-2xl bg-gold/15 ring-1 ring-gold/25" />
            <span className="absolute inset-1 flex rotate-3 items-center justify-center rounded-2xl bg-card text-gold shadow-[0_12px_30px_-12px_rgb(0_0_0/0.35)] ring-1 ring-border">
              <Icon className="size-8" />
            </span>
            {Badge ? (
              <span className="absolute -right-1 -bottom-1 flex size-7 items-center justify-center rounded-full bg-gold-gradient text-black ring-4 ring-background">
                <Badge className="size-3.5" />
              </span>
            ) : null}
          </div>
          <h2 className="mt-6 text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
          <div className="mt-2 text-sm leading-relaxed text-pretty text-muted-foreground sm:text-base">{description}</div>
        </div>
        {/* Fora da coluna do texto, para os botões caberem lado a lado. */}
        {actions ? <div className="mt-7 flex flex-wrap justify-center gap-3">{actions}</div> : null}
      </div>
      {children}
    </div>
  )
}
