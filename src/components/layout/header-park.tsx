"use client"

import { useLayoutEffect } from "react"

/**
 * Marca que a página visível tem um topo escuro (hero) sob o cabeçalho, para ele ficar "estacionado"
 * (transparente, texto claro). Vai dentro de cada hero, junto do atributo `data-header-park`.
 *
 * Por que não só o CSS `:has([data-header-park])`: o Next guarda as páginas já visitadas escondidas no DOM
 * para voltar rápido, e o `:has` também enxergaria o hero escondido, deixando o cabeçalho transparente
 * sobre uma página clara. Este componente só fica montado enquanto a página está na tela (páginas
 * escondidas desmontam os efeitos), então o atributo em <html> reflete só o que se vê (veja globals.css).
 */
export function HeaderPark() {
  useLayoutEffect(() => {
    const root = document.documentElement
    // Contador: numa troca de página, o hero novo pode montar antes do antigo desmontar.
    const count = Number(root.dataset.headerParks ?? 0) + 1
    root.dataset.headerParks = String(count)
    return () => {
      const remaining = Number(root.dataset.headerParks ?? 1) - 1
      if (remaining > 0) root.dataset.headerParks = String(remaining)
      else delete root.dataset.headerParks
    }
  }, [])
  return null
}
