"use client"

import { useEffect, useState, type ReactNode } from "react"

/** Rolagem a partir da qual o cabeçalho deixa o hero e vira a barra ativa. */
const SCROLL_THRESHOLD = 24

/**
 * Casca do cabeçalho. Ativo (ao rolar e nas páginas sem hero), é uma barra de vidro escuro presa ao topo,
 * com os cantos de baixo bem arredondados; texto e logo sempre claros, nos dois temas. Numa página com hero escuro (que marca
 * `data-header-park`), no topo ele fica "estacionado": transparente, texto e logo claros. Essa troca é
 * feita só por CSS (globals.css, `:has`), sem ler a rota: não trava a pré-renderização nem pisca.
 */
export function HeaderShell({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > SCROLL_THRESHOLD)
    update()
    window.addEventListener("scroll", update, { passive: true })
    return () => window.removeEventListener("scroll", update)
  }, [])

  return (
    // Ativo: sobe o espaço de cima (translate, sem mudar a altura e sem empurrar a página) e cola no topo,
    // com cantos arredondados só embaixo. Estacionado (globals.css): volta ao lugar, com todos os cantos.
    <header
      data-site-header
      data-scrolled={scrolled}
      className="page-container sticky top-0 z-40 -translate-y-3 pt-3 transition-transform duration-300 sm:-translate-y-4 sm:pt-4"
    >
      <div className="site-header-bar flex h-14 items-center gap-2 rounded-b-[28px] border border-t-0 border-white/10 bg-[#0b0a08]/60 px-4 text-white shadow-[0_12px_32px_-12px_rgb(0_0_0/0.45)] backdrop-blur-xl backdrop-saturate-150 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 sm:h-16 sm:px-8">
        {children}
      </div>
    </header>
  )
}
