import { useSyncExternalStore } from "react"
import { THEME_STORAGE_KEY } from "@/lib/theme-init"

/**
 * Tema do site (claro ou escuro), para componentes de cliente. A fonte da verdade é a classe
 * "dark" no <html>: o script de theme-init.ts a define antes da primeira pintura, a partir do
 * que foi salvo. Escuro é o padrão quando nada foi escolhido.
 */
export type Theme = "light" | "dark"

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
  window.addEventListener("storage", onChange)
  return () => {
    observer.disconnect()
    window.removeEventListener("storage", onChange)
  }
}

function getTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light"
}

export function setTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark")
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Sem armazenamento disponível: o tema vale só até recarregar a página.
  }
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getTheme, () => "dark" as Theme)
  return [theme, setTheme] as const
}
