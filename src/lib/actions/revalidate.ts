import "server-only"

import { refresh, updateTag } from "next/cache"
import { CATALOG_TAG } from "@/lib/data/catalog"

/**
 * Chamada pelas Server Actions após alterar o catálogo: expira o cache da vitrine
 * (leitura imediata dos novos dados) e atualiza a página atual do painel.
 */
export function catalogChanged() {
  updateTag(CATALOG_TAG)
  refresh()
}
