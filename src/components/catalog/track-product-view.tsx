"use client"

import { useEffect } from "react"
import { trackEvent } from "@/lib/analytics-client"

/** Conta uma visualização do produto por aba (não repete ao recarregar ou voltar para a página). */
export function TrackProductView({ productId }: { productId: string }) {
  useEffect(() => {
    const key = `abmc3d:viewed:${productId}`
    try {
      if (window.sessionStorage.getItem(key)) return
      window.sessionStorage.setItem(key, "1")
    } catch {
      // Sem sessionStorage: conta a visualização mesmo assim.
    }
    trackEvent("product_view", productId)
  }, [productId])

  return null
}
