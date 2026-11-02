"use client"

import { useState } from "react"
import { HiMinus, HiPlus } from "react-icons/hi2"
import { Button } from "@/components/ui/button"
import { MAX_QUANTITY, clampQuantity } from "@/lib/cart/cart"
import { cn } from "@/lib/utils"

/** Seletor de quantidade acessível, limitado a 1–99. */
export function QuantityInput({
  value,
  onChange,
  label,
  id,
  className,
  disabled,
}: {
  value: number
  onChange: (value: number) => void
  label: string
  id: string
  className?: string
  disabled?: boolean
}) {
  const [draft, setDraft] = useState<string | null>(null)

  const commit = (raw: string) => {
    setDraft(null)
    const parsed = Number.parseInt(raw, 10)
    onChange(Number.isNaN(parsed) ? value : clampQuantity(parsed))
  }

  return (
    <div className={cn("inline-flex items-center rounded-lg border border-input", className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onChange(clampQuantity(value - 1))}
        disabled={disabled || value <= 1}
        aria-label="Diminuir quantidade"
      >
        <HiMinus aria-hidden />
      </Button>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        disabled={disabled}
        value={draft ?? String(value)}
        onChange={(event) => setDraft(event.target.value.replace(/\D/g, "").slice(0, 2))}
        onBlur={(event) => commit(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault()
            commit(event.currentTarget.value)
          }
        }}
        aria-describedby={`${id}-hint`}
        className="h-10 w-12 bg-transparent text-center text-base font-semibold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      />
      <span id={`${id}-hint`} className="sr-only">
        Quantidade entre 1 e {MAX_QUANTITY}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onChange(clampQuantity(value + 1))}
        disabled={disabled || value >= MAX_QUANTITY}
        aria-label="Aumentar quantidade"
      >
        <HiPlus aria-hidden />
      </Button>
    </div>
  )
}
