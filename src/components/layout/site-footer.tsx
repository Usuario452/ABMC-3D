import Link from "next/link"
import { FaInstagram } from "react-icons/fa6"
import { BrandLogo } from "@/components/brand/brand-logo"
import { OpenCartLink } from "@/components/cart/open-cart-link"
import { CurrentYear } from "@/components/layout/current-year"
import { FooterWhatsAppButton } from "@/components/layout/footer-whatsapp-button"
import { siteConfig } from "@/config/site"
import { getWhatsAppContactUrl } from "@/lib/whatsapp"

const linkClass = "text-white/60 transition-colors outline-none hover:text-white focus-visible:text-white"

/**
 * Rodapé da loja: faixa escura de ponta a ponta (nos dois temas), com um brilho dourado no topo e o
 * logo gigante ao fundo, que surge de baixo para cima. Marca, links, WhatsApp e o aviso legal.
 */
export function SiteFooter() {
  const { texts } = siteConfig
  const whatsappUrl = getWhatsAppContactUrl()

  return (
    <footer className="relative isolate mt-16 overflow-hidden bg-[#0a0a0b] text-white">
      {/* Fio dourado no topo e brilho suave descendo dele. */}
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/60 to-transparent" />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-96 bg-[radial-gradient(ellipse_50%_100%_at_50%_0%,rgb(185_190_197/0.14),transparent)]"
      />
      {/* Logo gigante ao fundo, cortado embaixo e esmaecendo para cima. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 flex translate-y-[22%] justify-center opacity-[0.06]"
        style={{ maskImage: "linear-gradient(to top, black 15%, transparent 85%)" }}
      >
        <BrandLogo onDark sizes="100vw" className="w-[min(1400px,96vw)]" />
      </div>

      <div className="page-container pb-6">
        <div className="grid gap-8 pt-12 pb-10 text-sm sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1.5fr]">
          <div className="max-w-sm">
            <BrandLogo onDark className="w-32" />
            <p className="mt-4 leading-relaxed text-white/55">{texts.footerAbout}</p>
          </div>

          <nav aria-label="Páginas">
            <h2 className="text-xs font-semibold tracking-wide text-white/40 uppercase">Páginas</h2>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link href="/" className={linkClass}>
                  Início
                </Link>
              </li>
              <li>
                <Link href="/catalogo" className={linkClass}>
                  Catálogo
                </Link>
              </li>
              <li>
                <OpenCartLink className={linkClass}>Carrinho</OpenCartLink>
              </li>
            </ul>
          </nav>

          <div className="min-w-0">
            <h2 className="text-xs font-semibold tracking-wide text-white/40 uppercase">Atendimento</h2>
            <a
              href="https://www.instagram.com/abmc3d/"
              target="_blank"
              rel="noopener noreferrer"
              className={`${linkClass} mt-4 inline-flex items-center gap-2 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/70`}
            >
              <FaInstagram className="size-4 shrink-0" aria-hidden />
              Siga nosso Instagram
            </a>
            {whatsappUrl ? (
              <FooterWhatsAppButton url={whatsappUrl} />
            ) : (
              <p className="mt-4 text-white/55">Contato pelo WhatsApp em breve.</p>
            )}
            <p className="mt-3 text-xs leading-relaxed text-white/45">{texts.orderDisclaimer}</p>
          </div>
        </div>

        <div className="flex flex-col gap-1 border-t border-white/10 pt-5 text-xs text-white/40 sm:flex-row sm:justify-between">
          <p>
            © <CurrentYear /> {siteConfig.name}. Todos os direitos reservados.
          </p>
          <p>{texts.tagline}</p>
        </div>
      </div>
    </footer>
  )
}
