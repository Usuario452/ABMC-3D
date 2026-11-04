"use client"

import { HiOutlineMoon, HiOutlineSun } from "react-icons/hi2"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme, type Theme } from "@/lib/theme"

/**
 * Troca o tema com uma transição suave da página inteira (View Transitions), quando o navegador suporta
 * e a pessoa não pediu menos movimento; senão, troca na hora.
 */
function changeTheme(next: Theme, apply: (theme: Theme) => void) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const doc = document as Document & { startViewTransition?: (update: () => void) => unknown }
  if (!doc.startViewTransition || reduceMotion) {
    apply(next)
    return
  }
  doc.startViewTransition(() => apply(next))
}

/** Opção do menu: texto branco, dourado no hover/foco (como os links de categoria); o check fica dourado. */
const ITEM =
  "gap-2 rounded-lg px-3 py-2 font-medium text-white/90 focus:bg-white/10 focus:text-primary focus:**:text-primary [&_[data-slot=dropdown-menu-radio-item-indicator]]:text-primary"

/**
 * Seletor de tema do cabeçalho da loja: o ícone (sol no claro, lua no escuro) abre um menu com "Claro" e
 * "Escuro". Os dois ícones ficam sobrepostos e trocam girando e mudando de escala; quem aparece vem do CSS
 * (classe "dark" no <html>), não do estado, então o HTML do servidor já mostra o ícone certo.
 */
export function ThemeSelect() {
  const [theme, setTheme] = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Tema do site"
        title="Tema do site"
        className="group relative inline-flex size-10 cursor-pointer items-center justify-center rounded-full text-inherit transition-colors outline-none hover:bg-current/10 focus-visible:ring-2 focus-visible:ring-current/40 data-[state=open]:bg-current/10"
      >
        <HiOutlineSun
          className="absolute size-5 scale-100 rotate-0 opacity-100 transition-all duration-500 ease-out dark:scale-50 dark:-rotate-90 dark:opacity-0"
          aria-hidden
        />
        <HiOutlineMoon
          className="absolute size-5 scale-50 rotate-90 opacity-0 transition-all duration-500 ease-out dark:scale-100 dark:rotate-0 dark:opacity-100"
          aria-hidden
        />
      </DropdownMenuTrigger>
      {/* Mesmo vidro escuro do menu de categorias e da barra do cabeçalho. */}
      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="min-w-40 rounded-2xl border-white/10 bg-[#0a0a0b]/60 p-2 text-white shadow-2xl shadow-black/40 backdrop-blur-xl backdrop-saturate-150 duration-200 ease-out"
      >
        <DropdownMenuLabel className="px-3 pt-1 pb-1.5 text-[0.7rem] font-semibold tracking-wide text-white/50 uppercase">
          Tema
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={(value) => changeTheme(value as Theme, setTheme)}>
          <DropdownMenuRadioItem value="light" className={ITEM}>
            <HiOutlineSun className="size-4" aria-hidden />
            Claro
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark" className={ITEM}>
            <HiOutlineMoon className="size-4" aria-hidden />
            Escuro
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
