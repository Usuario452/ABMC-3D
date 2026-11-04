import Image from "next/image"
import { cn } from "@/lib/utils"
import { siteConfig } from "@/config/site"

/**
 * Logo oficial com fundo transparente (public/brand), na versão do tema ativo: texto branco no
 * escuro e texto escuro no claro. O arquivo mantém um respiro em volta; aqui ele é enquadrado
 * na área útil, sem alterar o arquivo.
 */
export function BrandLogo({
  className,
  preload = false,
  onDark = false,
  sizes = "(min-width: 768px) 360px, 280px",
}: {
  className?: string
  preload?: boolean
  /** Sempre a versão de texto branco (para fundos escuros), independente do tema. */
  onDark?: boolean
  /** Largura exibida, para o navegador escolher o arquivo certo (padrão: tamanho de cabeçalho). */
  sizes?: string
}) {
  const { srcOnDark, srcOnLight, alt, width, height, contentBox: box } = siteConfig.logo

  const position = {
    width: `${(width / box.width) * 100}%`,
    height: "auto",
    left: `${(-box.x / box.width) * 100}%`,
    top: `${(-box.y / box.height) * 100}%`,
  }

  return (
    <span
      className={cn("relative block overflow-hidden", className)}
      style={{ aspectRatio: `${box.width} / ${box.height}` }}
    >
      {/* Tema escuro (padrão do site): é a versão pré-carregada. */}
      <Image
        src={srcOnDark}
        alt={alt}
        width={width}
        height={height}
        preload={preload}
        sizes={sizes}
        className={cn("brand-logo-on-dark absolute max-w-none", onDark ? "block" : "hidden dark:block")}
        style={position}
      />
      <Image
        src={srcOnLight}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        className={cn("brand-logo-on-light absolute max-w-none", onDark ? "hidden" : "dark:hidden")}
        style={position}
      />
    </span>
  )
}
