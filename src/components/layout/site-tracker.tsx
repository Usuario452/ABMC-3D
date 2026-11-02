"use client"

import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"
import { trackVisit } from "@/lib/analytics-client"
import { getVisitorIds } from "@/lib/visitor-ids"

/** Registra cada página vista da vitrine (e só ela): origem, campanha e primeira visita incluídas. */
export function SiteTracker() {
  const pathname = usePathname()
  const last = useRef<string | null>(null)

  useEffect(() => {
    // O modo estrito do React roda o efeito duas vezes em desenvolvimento.
    if (last.current === pathname) return
    last.current = pathname

    const { visitorId, sessionId, isNewVisitor, isNewSession } = getVisitorIds()

    let referrerHost: string | null = null
    if (isNewSession && document.referrer) {
      try {
        const host = new URL(document.referrer).host
        referrerHost = host && host !== window.location.host ? host : null
      } catch {
        // Referrer inválido: ignora.
      }
    }
    const params = isNewSession ? new URLSearchParams(window.location.search) : null

    trackVisit({
      visitorId,
      sessionId,
      path: pathname,
      isEntry: isNewSession,
      isNewVisitor,
      referrerHost,
      utmSource: params?.get("utm_source") ?? null,
      utmMedium: params?.get("utm_medium") ?? null,
      utmCampaign: params?.get("utm_campaign") ?? null,
    })
  }, [pathname])

  return null
}
