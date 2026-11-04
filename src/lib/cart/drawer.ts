"use client"

import { useSyncExternalStore } from "react"

/**
 * Aberto/fechado da gaveta do carrinho, compartilhado entre o botão do cabeçalho, o "Adicionar ao
 * carrinho" e a própria gaveta (um store simples, como o do carrinho).
 */

let open = false
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function setCartDrawerOpen(next: boolean) {
  if (open === next) return
  open = next
  emit()
}

export const openCartDrawer = () => setCartDrawerOpen(true)
export const closeCartDrawer = () => setCartDrawerOpen(false)

export function useCartDrawerOpen() {
  return useSyncExternalStore(
    subscribe,
    () => open,
    () => false,
  )
}
