import type { ReactNode } from "react"
import type { IconType } from "react-icons"
import { cn } from "@/lib/utils"

/** Mensagem centralizada para estados vazios e de erro. */
export function StateMessage({
  icon: Icon,
  title,
  description,
  action,
  className,
  role,
}: {
  icon: IconType
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
  role?: "alert" | "status"
}) {
  return (
    <div
      role={role}
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 px-6 py-16 text-center",
        className,
      )}
    >
      <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-gold/10 text-gold">
        <Icon className="size-6" aria-hidden />
      </span>
      <h2 className="text-lg font-semibold">{title}</h2>
      {description ? <div className="mt-2 max-w-md text-sm text-muted-foreground">{description}</div> : null}
      {action ? <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div> : null}
    </div>
  )
}
