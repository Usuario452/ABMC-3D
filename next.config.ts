import type { NextConfig } from "next"
import type { RemotePattern } from "next/dist/shared/lib/image-config"

/** Origem permitida para next/image: o bucket público do R2 (NEXT_PUBLIC_IMAGES_BASE_URL). */
function imageRemotePatterns(): RemotePattern[] {
  const raw = process.env.NEXT_PUBLIC_IMAGES_BASE_URL
  if (!raw) return []
  try {
    const url = new URL(raw)
    return [
      {
        protocol: url.protocol.replace(":", "") as "http" | "https",
        hostname: url.hostname,
        port: url.port,
        pathname: `${url.pathname.replace(/\/+$/, "")}/products/**`,
      },
    ]
  } catch {
    // URL inválida: as imagens simplesmente não são exibidas até a correção do .env.
    return []
  }
}

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  cacheLife: {
    // Dados públicos do catálogo. O painel invalida a tag "catalog" a cada alteração;
    // a revalidação periódica cobre instâncias que não receberam a invalidação.
    catalog: {
      stale: 300,
      revalidate: 300,
      expire: 86400,
    },
  },
  images: {
    remotePatterns: imageRemotePatterns(),
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 828, 1080, 1280, 1920],
    imageSizes: [64, 128, 256, 384],
    minimumCacheTTL: 86400,
  },
  experimental: {
    serverActions: {
      // Uploads de imagem passam por Server Actions (um arquivo por requisição, até 4 MB).
      bodySizeLimit: "5mb",
    },
  },
  poweredByHeader: false,
  // Esconde o botão "N" do Next.js em desenvolvimento (cobria o avatar do painel).
  devIndicators: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ]
  },
  async redirects() {
    // A tela "Visitantes" virou "Analytics".
    return [{ source: "/admin/visitantes", destination: "/admin/analytics", permanent: true }]
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
}

export default nextConfig
