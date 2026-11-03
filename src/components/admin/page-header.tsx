import Link from "next/link"
import type { ReactNode } from "react"
import { HiArrowLeft } from "react-icons/hi2"

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: string
  description?: string
  actions?: ReactNode
  /** Link de retorno exibido acima do título (ex.: voltar para a lista). */
  back?: { href: string; label: string }
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back ? (
          <Link
            href={back.href}
            className="mb-3 inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground transition-colors outline-none hover:text-gold focus-visible:text-gold focus-visible:ring-2 focus-visible:ring-ring"
          >
            <HiArrowLeft className="size-4" aria-hidden />
            {back.label}
          </Link>
        ) : null}
        <h1 className="text-xl font-bold tracking-tight text-balance sm:text-2xl">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-[13px] text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2 sm:shrink-0">{actions}</div> : null}
    </div>
  )
}
