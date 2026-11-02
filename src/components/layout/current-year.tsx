"use client"

import { useSyncExternalStore } from "react"

const subscribe = () => () => {}

/** Ano atual calculado no navegador (evita data fixa na página pré-renderizada). */
export function CurrentYear() {
  const year = useSyncExternalStore(
    subscribe,
    () => new Date().getFullYear(),
    () => null,
  )
  return <span suppressHydrationWarning>{year ?? ""}</span>
}
