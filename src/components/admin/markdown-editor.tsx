"use client"

import { useRef, useState } from "react"
import type { IconType } from "react-icons"
import { HiOutlineH2, HiOutlineLink, HiOutlineListBullet } from "react-icons/hi2"
import { Markdown } from "@/components/shared/markdown"
import { cn } from "@/lib/utils"

type Action = { label: string; icon?: IconType; text?: string; apply: (selected: string) => [string, string, string] }

/** Cada ação devolve [antes, conteúdo, depois] para envolver o trecho selecionado. */
const ACTIONS: Action[] = [
  { label: "Título", icon: HiOutlineH2, apply: (s) => ["\n## ", s || "Título", "\n"] },
  { label: "Negrito", text: "B", apply: (s) => ["**", s || "negrito", "**"] },
  { label: "Itálico", text: "I", apply: (s) => ["_", s || "itálico", "_"] },
  {
    label: "Lista",
    icon: HiOutlineListBullet,
    apply: (s) => ["\n", (s || "item").split("\n").map((line) => `- ${line}`).join("\n"), "\n"],
  },
  { label: "Link", icon: HiOutlineLink, apply: (s) => ["[", s || "texto", "](https://)"] },
]

/** Campo de texto em Markdown com atalhos de formatação e prévia, no mesmo estilo da loja. */
export function MarkdownEditor({
  id,
  value,
  onChange,
  onBlur,
  invalid,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  invalid?: boolean
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [preview, setPreview] = useState(false)

  function wrap(action: Action) {
    const area = ref.current
    if (!area) return
    const { selectionStart: start, selectionEnd: end } = area
    const [before, content, after] = action.apply(value.slice(start, end))
    onChange(value.slice(0, start) + before + content + after + value.slice(end))
    // Mantém o conteúdo inserido selecionado, para continuar digitando por cima.
    requestAnimationFrame(() => {
      area.focus()
      area.setSelectionRange(start + before.length, start + before.length + content.length)
    })
  }

  const tab = (active: boolean) =>
    cn(
      "rounded-md px-2 py-1 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
      active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
    )

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-input focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        invalid && "border-destructive",
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-input bg-muted/40 px-1.5 py-1">
        <div className="flex items-center gap-0.5" role="toolbar" aria-label="Formatação">
          {ACTIONS.map((action) => (
            <button
              key={action.label}
              type="button"
              title={action.label}
              aria-label={action.label}
              disabled={preview}
              onClick={() => wrap(action)}
              className={cn(
                "flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40",
                action.text === "I" && "italic",
              )}
            >
              {action.icon ? <action.icon className="size-4" aria-hidden /> : <span className="text-sm font-bold">{action.text}</span>}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-0.5 rounded-md bg-muted p-0.5">
          <button type="button" className={tab(!preview)} onClick={() => setPreview(false)} aria-pressed={!preview}>
            Escrever
          </button>
          <button type="button" className={tab(preview)} onClick={() => setPreview(true)} aria-pressed={preview}>
            Visualizar
          </button>
        </div>
      </div>

      {preview ? (
        <div className="min-h-32 px-3 py-2 text-sm">
          {value.trim() ? <Markdown>{value}</Markdown> : <p className="text-muted-foreground">Nada para visualizar.</p>}
        </div>
      ) : (
        <textarea
          ref={ref}
          id={id}
          rows={6}
          value={value}
          aria-invalid={invalid}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          placeholder={"Materiais, medidas, cores…\n\nUse **negrito**, _itálico_ e listas com - no início da linha."}
          className="block min-h-32 w-full resize-y bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
        />
      )}
    </div>
  )
}
