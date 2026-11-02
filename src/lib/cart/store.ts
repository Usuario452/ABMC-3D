"use client"

import { useSyncExternalStore } from "react"
import { siteConfig } from "@/config/site"
import { parseStoredCart, type CartItem } from "@/lib/cart/cart"

/**
 * Estado do carrinho persistido no localStorage, sincronizado entre abas.
 * Implementado como "external store" para funcionar com useSyncExternalStore.
 */

const STORAGE_KEY = siteConfig.cart.storageKey
const EMPTY: CartItem[] = []

let items: CartItem[] = EMPTY
let loaded = false
const listeners = new Set<() => void>()

function load() {
  if (loaded || typeof window === "undefined") return
  loaded = true
  try {
    items = parseStoredCart(window.localStorage.getItem(STORAGE_KEY))
  } catch {
    items = EMPTY
  }
}

function emit() {
  listeners.forEach((listener) => listener())
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Armazenamento indisponível (modo privado ou cota): o carrinho segue em memória.
  }
}

function onStorage(event: StorageEvent) {
  if (event.key !== STORAGE_KEY) return
  items = parseStoredCart(event.newValue)
  emit()
}

function subscribe(listener: () => void) {
  load()
  listeners.add(listener)
  if (listeners.size === 1) window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) window.removeEventListener("storage", onStorage)
  }
}

function getSnapshot() {
  load()
  return items
}

function getServerSnapshot() {
  return EMPTY
}

export function setCartItems(update: (current: CartItem[]) => CartItem[]) {
  load()
  const next = update(items)
  if (next === items) return
  items = next
  persist()
  emit()
}

export function useCartItems() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/** true depois que o carrinho do navegador foi carregado (evita "carrinho vazio" piscando). */
export function useCartHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
}
