"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { HiCheckCircle, HiExclamationTriangle, HiInformationCircle, HiXCircle, HiArrowPath } from "react-icons/hi2"
import { useTheme } from "@/lib/theme"

/**
 * Toasts da marca: cartão no tema atual (claro ou escuro) com faixa de cor à esquerda por tipo, ícone,
 * título e descrição.
 * "unstyled" dá controle total do visual; o posicionamento e as animações continuam do Sonner.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  // O tema do Sonner acompanha o do site; com ele fixo em "dark", o texto saía claro sobre o cartão claro.
  const [theme] = useTheme()
  return (
    <Sonner
      theme={theme}
      position="top-right"
      offset="1.25rem"
      gap={10}
      visibleToasts={4}
      closeButton
      // Com um modal aberto, o Radix bloqueia cliques no resto da página; os toasts continuam clicáveis.
      className="toaster group pointer-events-auto"
      icons={{
        success: <HiCheckCircle className="size-5" />,
        info: <HiInformationCircle className="size-5" />,
        warning: <HiExclamationTriangle className="size-5" />,
        error: <HiXCircle className="size-5" />,
        loading: <HiArrowPath className="size-5 animate-spin" />,
      }}
      style={{ "--width": "392px" } as React.CSSProperties}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "group/toast relative grid w-full grid-cols-[auto_1fr] items-start gap-x-3 overflow-hidden rounded-xl border border-border bg-popover/95 py-4 pr-11 pl-5 text-popover-foreground shadow-xl shadow-black/15 backdrop-blur-md dark:shadow-black/60 before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:w-1 before:content-['']",
          success: "before:bg-success",
          error: "before:bg-destructive",
          warning: "before:bg-gold",
          info: "before:bg-sky-400",
          icon: "col-start-1 row-start-1 mt-px flex size-5 shrink-0 items-center justify-center text-muted-foreground group-data-[type=success]/toast:text-success group-data-[type=error]/toast:text-destructive group-data-[type=warning]/toast:text-gold group-data-[type=info]/toast:text-sky-400",
          content: "col-start-2 row-start-1 flex min-w-0 flex-col gap-1",
          title: "text-sm leading-snug font-semibold text-foreground!",
          description: "line-clamp-2 text-[0.8125rem] leading-snug text-muted-foreground!",
          actionButton:
            "col-start-2 mt-3 justify-self-start rounded-lg bg-gold-gradient px-3 py-1.5 text-xs font-semibold text-[#0a0a0b] transition-opacity hover:opacity-90",
          cancelButton:
            "col-start-2 mt-3 justify-self-start rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
          closeButton:
            "absolute top-2.5 right-2.5 flex size-6 items-center justify-center rounded-md border-0! bg-transparent! text-muted-foreground! transition-colors hover:bg-foreground/10! hover:text-foreground!",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
