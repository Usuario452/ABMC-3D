/**
 * Configuração central da KuboStudio.
 * Ajuste textos, SEO e dados da marca aqui, sem alterar componentes.
 * O número de WhatsApp vem da variável NEXT_PUBLIC_WHATSAPP_NUMBER.
 */
export const siteConfig = {
  name: "KuboStudio",
  locale: "pt-BR",
  htmlLang: "pt-BR",
  currency: "BRL",

  logo: {
    // Logos com fundo transparente (kit de marca em public/brand, veja docs/BRAND.md):
    // texto branco para o tema escuro e texto escuro para o tema claro.
    srcOnDark: "/brand/kubostudio-logo-light.png",
    srcOnLight: "/brand/kubostudio-logo-dark.png",
    alt: "KuboStudio",
    width: 1246,
    height: 344,
    /**
     * Área útil do logo dentro do arquivo (em pixels), sem o respiro transparente de 48 px
     * que o kit de marca mantém em volta. Usada para enquadrar o logo no cabeçalho.
     */
    contentBox: { x: 48, y: 48, width: 1150, height: 248 },
  },

  seo: {
    title: "KuboStudio — Produtos em impressão 3D",
    titleTemplate: "%s | KuboStudio",
    description:
      "Catálogo da KuboStudio: produtos fabricados por impressão 3D. Monte seu pedido e finalize pelo WhatsApp.",
    keywords: ["KuboStudio", "impressão 3D", "produtos impressos em 3D", "catálogo", "decoração"],
  },

  texts: {
    tagline: "Soluções em impressão 3D",
    // Palavras entre *asteriscos* ganham destaque (degradê dourado) no título do hero; "\n" quebra a linha.
    heroTitle: "Camada a camada,\na sua ideia *ganha forma*.",
    heroDescription:
      "Peças, presentes e protótipos em impressão 3D, para você e para a sua empresa. Encontre no catálogo ou peça sob medida.",
    categoriesTitle: "Categorias",
    featuredTitle: "Destaques",
    latestTitle: "Novidades",
    allProductsTitle: "Todos os produtos",
    customTitle: "Tem uma ideia? A gente imprime.",
    customDescription:
      "Peças com o seu nome, logo ou foto, brindes para a sua empresa e projetos do zero. Conte o que você imagina e receba um orçamento pelo WhatsApp.",
    customPoints: ["Nome, logo ou foto", "Brindes e lotes para empresas", "Do esboço ao modelo 3D"],
    customWhatsAppMessage: "Olá, KuboStudio! Vim pelo site e gostaria de um orçamento para um item personalizado.",
    orderDisclaimer:
      "Disponibilidade e prazo de produção são confirmados pela KuboStudio no WhatsApp.",
    footerAbout: "Produtos fabricados por impressão 3D. Pedidos e atendimento pelo WhatsApp.",
  },

  catalog: {
    pageSize: 12,
    featuredLimit: 12,
    relatedLimit: 4,
    /** Produto conta como "Novidade" por estes dias após publicado. */
    newDays: 30,
    /** Faixas de preço da coluna de filtros, em reais (null = sem limite). */
    priceRanges: [
      { min: null, max: 30 },
      { min: 30, max: 60 },
      { min: 60, max: 100 },
      { min: 100, max: null },
    ] as { min: number | null; max: number | null }[],
  },

  cart: {
    storageKey: "kubostudio:cart:v1",
    maxQuantityPerItem: 99,
    maxItems: 50,
  },
} as const

export type SiteConfig = typeof siteConfig
