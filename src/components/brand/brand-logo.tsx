import Image from "next/image"
import { cn } from "@/lib/utils"
import { siteConfig } from "@/config/site"

/**
 * Logo oficial com fundo transparente (public/brand), na versão do tema ativo: texto branco no
 * escuro e texto escuro no claro. O arquivo mantém um respiro em volta; aqui ele é enquadrado
 * na área útil, sem alterar o arquivo.
 */
export function BrandLogo({ className, preload = false }: { className?: string; preload?: boolean }) {
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
        sizes="(min-width: 768px) 360px, 280px"
        className="absolute hidden max-w-none dark:block"
        style={position}
      />
      <Image
        src={srcOnLight}
        alt={alt}
        width={width}
        height={height}
        sizes="(min-width: 768px) 360px, 280px"
        className="absolute max-w-none dark:hidden"
        style={position}
      />
    </span>
  )
}
