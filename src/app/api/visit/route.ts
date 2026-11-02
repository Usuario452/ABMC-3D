import { z } from "zod"
import { recordVisit } from "@/lib/analytics"
import { readGeo } from "@/lib/geo"
import { parseUserAgent } from "@/lib/user-agent"

const text = (max: number) => z.string().trim().max(max).nullish().transform((value) => value || null)

const visitSchema = z.object({
  visitorId: z.uuid(),
  sessionId: z.uuid(),
  path: z.string().max(300).regex(/^\/(?!\/)/),
  isEntry: z.boolean(),
  isNewVisitor: z.boolean(),
  referrerHost: text(120),
  utmSource: text(100),
  utmMedium: text(100),
  utmCampaign: text(100),
})

/** Recebe uma página vista da vitrine (anônima). O painel administrativo nunca é contado. */
export async function POST(request: Request) {
  // Exigir JSON impede o envio por formulários de outros sites.
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return new Response(null, { status: 415 })
  }
  const parsed = visitSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success || parsed.data.path.startsWith("/admin") || parsed.data.path.startsWith("/api")) {
    return new Response(null, { status: 400 })
  }

  const agent = parseUserAgent(request.headers.get("user-agent"))
  // Robôs e verificadores não entram nas estatísticas.
  if (agent.bot) return new Response(null, { status: 204 })

  const { data } = parsed
  await recordVisit({
    visitorId: data.visitorId,
    sessionId: data.sessionId,
    path: data.path,
    isEntry: data.isEntry,
    isNewVisitor: data.isNewVisitor,
    referrerHost: data.referrerHost,
    utm: { source: data.utmSource, medium: data.utmMedium, campaign: data.utmCampaign },
    geo: readGeo(request.headers),
    agent,
  })
  return new Response(null, { status: 204 })
}
