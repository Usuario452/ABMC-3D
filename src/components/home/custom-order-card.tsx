import Link from "next/link"
import { FaWhatsapp } from "react-icons/fa6"
import type { IconType } from "react-icons"
import {
  HiArrowRight,
  HiOutlineBuildingOffice2,
  HiOutlineCube,
  HiOutlinePhoto,
  HiOutlineSparkles,
} from "react-icons/hi2"
import { Button } from "@/components/ui/button"
import { CustomTag3D } from "@/components/home/custom-tag-3d"
import { siteConfig } from "@/config/site"
import { cn } from "@/lib/utils"
import { buildWhatsAppUrl, getWhatsAppConfig } from "@/lib/whatsapp"

// Um ícone para cada ponto de texts.customPoints, na mesma ordem.
const pointIcons: IconType[] = [HiOutlinePhoto, HiOutlineBuildingOffice2, HiOutlineCube]

/**
 * Card de itens personalizados da home, num degradê do preto para o dourado e o dourado escuro da marca: texto e chamada para o WhatsApp à
 * esquerda e, à direita, um chaveiro personalizado em 3D. Sem WhatsApp configurado, leva ao catálogo.
 */
export function CustomOrderCard({ className = "pt-12" }: { className?: string }) {
  const { texts } = siteConfig
  const whatsapp = getWhatsAppConfig()
  const whatsappUrl = whatsapp.ok ? buildWhatsAppUrl(whatsapp.number, texts.customWhatsAppMessage) : null

  return (
    <section className={cn("page-container", className)} aria-labelledby="personalizados-titulo">
      <div className="flex items-center gap-6 rounded-3xl bg-[linear-gradient(110deg,#0b0a08_45%,var(--brand-gold)_85%,var(--brand-gold-dark))] p-6 text-white sm:p-8 lg:gap-10 lg:px-10">
        <div className="min-w-0 flex-1">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-primary uppercase">
            <HiOutlineSparkles className="size-4" aria-hidden />
            Sob medida
          </p>
          <h2 id="personalizados-titulo" className="mt-2 text-xl leading-tight font-bold tracking-tight sm:text-2xl">
            {texts.customTitle}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">{texts.customDescription}</p>
          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
            {texts.customPoints.map((point, index) => {
              const Icon = pointIcons[index] ?? HiOutlineCube
              return (
                <li
                  key={point}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-white/85"
                >
                  <Icon className="size-3.5 shrink-0 text-primary" aria-hidden />
                  {point}
                </li>
              )
            })}
          </ul>
          <div className="mt-5">
            {whatsappUrl ? (
              <Button asChild>
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <FaWhatsapp aria-hidden />
                  Pedir orçamento no WhatsApp
                </a>
              </Button>
            ) : (
              <Button asChild>
                <Link href="/catalogo">
                  Explorar catálogo
                  <HiArrowRight aria-hidden />
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Chaveiro personalizado em 3D (CSS) à direita; some no celular para o card ficar baixo. */}
        <CustomTag3D className="mr-8 hidden shrink-0 sm:block lg:mr-28 xl:mr-40" />
      </div>
    </section>
  )
}

/**
 * Versão compacta do card sob medida, numa faixa fina: selo, título, os pontos em uma linha (some no
 * celular) e o botão do WhatsApp. Usada na página de cada categoria, entre os produtos e as novidades.
 */
export function CustomOrderStrip({ className }: { className?: string }) {
  const { texts } = siteConfig
  const whatsapp = getWhatsAppConfig()
  const whatsappUrl = whatsapp.ok ? buildWhatsAppUrl(whatsapp.number, texts.customWhatsAppMessage) : null

  return (
    <section className={cn("page-container", className)} aria-labelledby="personalizados-faixa-titulo">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl bg-[linear-gradient(100deg,#0b0a08_60%,var(--brand-gold-dark)_120%)] px-5 py-4 text-white sm:flex-nowrap sm:px-6">
        <span className="hidden size-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-primary ring-1 ring-white/10 sm:flex">
          <HiOutlineSparkles className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 basis-full sm:basis-auto">
          <h2 id="personalizados-faixa-titulo" className="text-sm font-semibold sm:text-base">
            <span className="mb-0.5 block text-xs font-semibold tracking-wide text-primary uppercase sm:mr-2 sm:mb-0 sm:inline">
              Sob medida
            </span>
            {texts.customTitle}
          </h2>
          <p className="mt-0.5 hidden truncate text-xs text-white/60 md:block">{texts.customPoints.join(" · ")}</p>
        </div>
        {whatsappUrl ? (
          <Button asChild size="sm" className="h-9 shrink-0 px-4">
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <FaWhatsapp aria-hidden />
              Pedir orçamento
            </a>
          </Button>
        ) : (
          <Button asChild size="sm" variant="outline" className="h-9 shrink-0 px-4">
            <Link href="/catalogo">
              Explorar catálogo
              <HiArrowRight aria-hidden />
            </Link>
          </Button>
        )}
      </div>
    </section>
  )
}
