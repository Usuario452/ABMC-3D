import ReactMarkdown, { type Components } from "react-markdown"
import { cn } from "@/lib/utils"

/** Elementos com o estilo do site. HTML escrito no texto não é interpretado (padrão do react-markdown). */
const COMPONENTS: Components = {
  h1: ({ children }) => <h3 className="text-base font-semibold text-foreground">{children}</h3>,
  h2: ({ children }) => <h3 className="text-base font-semibold text-foreground">{children}</h3>,
  h3: ({ children }) => <h4 className="text-sm font-semibold text-foreground">{children}</h4>,
  p: ({ children }) => <p className="whitespace-pre-line">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="text-gold underline-offset-4 hover:underline">
      {children}
    </a>
  ),
  img: () => null,
}

/** Texto em Markdown (descrição de produto). */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("space-y-3 text-muted-foreground", className)}>
      <ReactMarkdown components={COMPONENTS}>{children}</ReactMarkdown>
    </div>
  )
}

/** Versão em texto puro (meta description, prévias): remove a marcação do Markdown. */
export function markdownToText(markdown: string) {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/(\*\*|__|\*|_|`)/g, "")
    .replace(/\s+/g, " ")
    .trim()
}
