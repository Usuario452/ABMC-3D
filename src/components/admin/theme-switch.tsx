"use client"

import { motion, useReducedMotion } from "motion/react"
import { HiMoon, HiSun } from "react-icons/hi2"
import type { Theme } from "@/lib/theme"
import { cn } from "@/lib/utils"

/** Posições das estrelinhas do trilho no tema escuro (em % do trilho). */
const STARS = [
  { left: "18%", top: "28%", size: 2 },
  { left: "32%", top: "62%", size: 1.5 },
  { left: "46%", top: "30%", size: 1.5 },
]

/**
 * Visual do seletor de tema: trilho em pílula com o botão deslizando entre sol (claro) e lua (escuro).
 * Só desenha: quem usa controla o clique e a acessibilidade (role="switch").
 */
export function ThemeSwitchVisual({ theme }: { theme: Theme }) {
  const reduceMotion = useReducedMotion()
  const dark = theme === "dark"
  const spring = reduceMotion ? { duration: 0 } : { type: "spring" as const, stiffness: 500, damping: 32 }

  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex h-7 w-[52px] shrink-0 items-center rounded-full p-[3px] transition-colors duration-300",
        dark ? "bg-[#1b2236] ring-1 ring-white/10" : "bg-[#fde9b5] ring-1 ring-[#f2c94c]/60",
      )}
    >
      {/* Estrelas aparecem no escuro, à esquerda do botão. */}
      {STARS.map((star) => (
        <motion.span
          key={`${star.left}-${star.top}`}
          className="absolute rounded-full bg-white"
          style={{ left: star.left, top: star.top, width: star.size, height: star.size }}
          initial={false}
          animate={{ opacity: dark ? 0.85 : 0, scale: dark ? 1 : 0.4 }}
          transition={{ duration: 0.25 }}
        />
      ))}

      <motion.span
        className={cn(
          "relative z-10 flex size-[22px] items-center justify-center rounded-full shadow-sm",
          dark ? "bg-[#2c3550] text-[#e8ecff]" : "bg-white text-[#e3a008]",
        )}
        initial={false}
        animate={{ x: dark ? 24 : 0 }}
        transition={spring}
      >
        <motion.span
          key={theme}
          initial={reduceMotion ? false : { rotate: -90, scale: 0.5, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="flex"
        >
          {dark ? <HiMoon className="size-3.5" /> : <HiSun className="size-3.5" />}
        </motion.span>
      </motion.span>
    </span>
  )
}
