import type { IconType } from "react-icons"
import { HiOutlineChatBubbleLeftRight, HiOutlineCube, HiOutlinePhoto } from "react-icons/hi2"
import { LoginArtwork } from "@/components/admin/login-artwork"
import { siteConfig } from "@/config/site"

const highlights: { icon: IconType; label: string }[] = [
  { icon: HiOutlineCube, label: "Produtos e categorias" },
  { icon: HiOutlinePhoto, label: "Imagens em WebP otimizado" },
  { icon: HiOutlineChatBubbleLeftRight, label: "Pedidos pelo WhatsApp" },
]

/** Ilustração e mensagem da tela de login (visível a partir de lg), sobre o mesmo fundo do formulário. */
export function LoginShowcase() {
  return (
    <section className="hidden flex-col gap-8 lg:flex" aria-label="KuboStudio">
      <LoginArtwork className="mx-auto max-h-[44dvh] max-w-md xl:max-w-xl 2xl:max-w-2xl" />

      <div className="space-y-6">
        <div className="space-y-3">
          <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">{siteConfig.texts.tagline}</p>
          <h2 className="max-w-lg text-3xl leading-tight font-bold xl:text-4xl 2xl:text-5xl">
            Gerencie o catálogo da <span className="text-gold-gradient">KuboStudio</span>
          </h2>
          <p className="max-w-lg text-sm text-muted-foreground xl:text-base 2xl:text-lg">
            Cadastre produtos, organize categorias e publique imagens otimizadas. Os pedidos chegam direto no WhatsApp
            da loja.
          </p>
        </div>
        <ul className="flex flex-wrap gap-2.5">
          {highlights.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="flex items-center gap-2 rounded-full border border-border bg-surface/70 py-1.5 pr-3.5 pl-2.5 text-xs font-medium text-foreground/90 backdrop-blur"
            >
              <Icon className="size-4 text-gold" aria-hidden />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
