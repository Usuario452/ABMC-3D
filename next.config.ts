import type { NextConfig } from "next"
import type { RemotePattern } from "next/dist/shared/lib/image-config"

/** Pastas do bucket com imagens exibidas pelo site: fotos de produto e capas de categoria. */
const IMAGE_FOLDERS = ["products", "categories"]

/**
 * Origem permitida para next/image. Com NEXT_PUBLIC_IMAGES_BASE_URL, o domínio público do bucket; sem ela,
 * o endereço S3 do R2 com URLs assinadas (a assinatura vai na query, por isso `search` fica livre).
 */
function imageRemotePatterns(): RemotePattern[] {
  const raw = process.env.NEXT_PUBLIC_IMAGES_BASE_URL?.trim()
  // O endereço da API S3 do R2 não é público: nesse caso as imagens também usam URL assinada.
  if (!raw || /\.r2\.cloudflarestorage\.com(\/|$)/i.test(raw)) {
    const account = process.env.R2_ACCOUNT_ID?.trim()
    const bucket = process.env.R2_BUCKET?.trim()
    if (!account || !bucket) return []
    return IMAGE_FOLDERS.map((folder) => ({
      protocol: "https" as const,
      hostname: `${account}.r2.cloudflarestorage.com`,
      pathname: `/${bucket}/${folder}/**`,
    }))
  }
  try {
    const url = new URL(raw)
    return IMAGE_FOLDERS.map((folder) => ({
      protocol: url.protocol.replace(":", "") as "http" | "https",
      hostname: url.hostname,
      port: url.port,
      pathname: `${url.pathname.replace(/\/+$/, "")}/${folder}/**`,
    }))
  } catch {
    // URL inválida: as imagens simplesmente não são exibidas até a correção do .env.
    return []
  }
}

const nextConfig: NextConfig = {
  // Argumentos de Server Functions podem conter senhas; nunca registrá-los no desenvolvimento.
  logging: process.env.NODE_ENV === "development" ? { serverFunctions: false } : undefined,
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
    // 75 é o padrão; 85 só na foto grande da galeria do produto (obrigatório listar no Next 16).
    qualities: [75, 85],
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
