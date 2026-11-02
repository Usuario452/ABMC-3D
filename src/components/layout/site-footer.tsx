import Link from "next/link"
import { FaWhatsapp } from "react-icons/fa6"
import { BrandLogo } from "@/components/brand/brand-logo"
import { CurrentYear } from "@/components/layout/current-year"
import { siteConfig } from "@/config/site"
import { getWhatsAppContactUrl } from "@/lib/whatsapp"

export function SiteFooter() {
  const whatsappUrl = getWhatsAppContactUrl()

  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="page-container grid gap-10 py-12 md:grid-cols-3">
        <div className="space-y-4">
          <BrandLogo className="w-40" />
          <p className="max-w-xs text-sm text-muted-foreground">{siteConfig.texts.footerAbout}</p>
        </div>

        <nav aria-label="Rodapé" className="space-y-3">
          <h2 className="text-sm font-semibold">Navegação</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link href="/" className="hover:text-foreground focus-visible:text-foreground">
                Início
              </Link>
            </li>
            <li>
              <Link href="/catalogo" className="hover:text-foreground focus-visible:text-foreground">
                Catálogo
              </Link>
            </li>
            <li>
              <Link href="/carrinho" className="hover:text-foreground focus-visible:text-foreground">
                Carrinho
              </Link>
            </li>
          </ul>
        </nav>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Contato</h2>
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground focus-visible:text-foreground"
            >
              <FaWhatsapp className="size-5 text-gold" aria-hidden />
              Fale conosco pelo WhatsApp
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">Contato pelo WhatsApp em breve.</p>
          )}
          <p className="text-xs text-muted-foreground">{siteConfig.texts.orderDisclaimer}</p>
        </div>
      </div>
      <div className="border-t border-border">
        <p className="page-container py-5 text-xs text-muted-foreground">
          © <CurrentYear /> {siteConfig.name}. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  )
}
