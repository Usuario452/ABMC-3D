"use client"

import { useState } from "react"
import { HiChevronDown, HiOutlinePlus, HiOutlineTag, HiStar, HiXMark } from "react-icons/hi2"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type CategoryOption = { id: string; name: string; is_active: boolean }

/**
 * Seleção de uma ou mais categorias do produto. O campo tem altura fixa e mostra quantas foram escolhidas; as
 * escolhidas aparecem como etiquetas logo abaixo, numa linha que rola na horizontal, na ordem em que foram
 * marcadas (a primeira é o rótulo exibido no card da loja). A lista abre num popover.
 */
export function CategoryMultiSelect({
  id,
  options,
  value,
  onChange,
  onBlur,
  onCreate,
  disabled,
  invalid,
}: {
  id: string
  options: CategoryOption[]
  value: string[]
  onChange: (ids: string[]) => void
  onBlur?: () => void
  /** Abre o cadastro de categoria (lista vazia). */
  onCreate: () => void
  disabled?: boolean
  invalid?: boolean
}) {
  const [open, setOpen] = useState(false)
  const byId = new Map(options.map((option) => [option.id, option]))
  const selected = value.map((categoryId) => byId.get(categoryId)).filter((option) => option !== undefined)

  const toggle = (categoryId: string) =>
    onChange(value.includes(categoryId) ? value.filter((item) => item !== categoryId) : [...value, categoryId])

  return (
    <div className="min-w-0 space-y-2">
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) onBlur?.()
        }}
      >
        <PopoverTrigger asChild disabled={disabled}>
          <button
            id={id}
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-controls={`${id}-list`}
            aria-required
            aria-invalid={invalid}
            className={cn(
              "flex h-9 w-full cursor-pointer items-center gap-2 rounded-md border border-input bg-transparent px-3 text-left text-sm shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive dark:bg-input/30",
            )}
          >
            <HiOutlineTag className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className={cn("min-w-0 flex-1 truncate", selected.length === 0 && "text-muted-foreground")}>
              {selected.length === 0
                ? "Selecione"
                : selected.length === 1
                  ? "1 categoria selecionada"
                  : `${selected.length} categorias selecionadas`}
            </span>
            <HiChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={6} className="w-(--radix-popover-trigger-width) p-1">
          {options.length === 0 ? (
            <div className="flex flex-col items-center gap-2.5 px-3 py-4 text-center">
              <p className="text-xs text-muted-foreground">Nenhuma categoria cadastrada.</p>
              <button
                type="button"
                onClick={onCreate}
                className="inline-flex cursor-pointer items-center gap-1 rounded-md text-xs font-medium text-gold underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              >
                <HiOutlinePlus className="size-3.5" aria-hidden />
                Criar categoria
              </button>
            </div>
          ) : (
            <ul
              id={`${id}-list`}
              role="listbox"
              aria-multiselectable
              aria-label="Categorias"
              className="max-h-64 overflow-y-auto"
            >
              {options.map((option) => {
                const checked = value.includes(option.id)
                return (
                  <li key={option.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={checked}
                      onClick={() => toggle(option.id)}
                      className="flex w-full cursor-pointer items-center gap-2.5 rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-muted focus-visible:bg-muted"
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
                          checked ? "border-primary bg-primary text-primary-foreground" : "border-input",
                        )}
                      >
                        {checked ? (
                          <svg
                            viewBox="0 0 16 16"
                            className="size-3"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{option.name}</span>
                      {!option.is_active ? <span className="text-xs text-muted-foreground">inativa</span> : null}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </PopoverContent>
      </Popover>

      {/* Escolhidas, numa linha que rola na horizontal (cada uma com o x para remover). */}
      {selected.length > 0 ? (
        <ul aria-label="Categorias selecionadas" className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {selected.map((option, index) => (
            <li
              key={option.id}
              className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary py-0.5 pr-1 pl-2 text-xs font-medium whitespace-nowrap text-primary-foreground"
            >
              {option.name}
              {index === 0 && selected.length > 1 ? (
                <HiStar className="size-3 shrink-0" aria-label="principal" role="img" />
              ) : null}
              <button
                type="button"
                disabled={disabled}
                aria-label={`Remover ${option.name}`}
                onClick={() => toggle(option.id)}
                className="flex size-4 cursor-pointer items-center justify-center rounded-sm text-primary-foreground/70 outline-none hover:bg-black/10 hover:text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <HiXMark className="size-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
