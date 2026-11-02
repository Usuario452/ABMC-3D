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
    tagline: "Produtos fabricados por impressão 3D",
    heroTitle: "Design e impressão 3D em cada detalhe",
    heroDescription:
      "Conheça o catálogo da KuboStudio, escolha seus produtos e envie o pedido pelo WhatsApp. Disponibilidade, prazo e pagamento são combinados diretamente com a gente.",
    categoriesTitle: "Categorias",
    featuredTitle: "Destaques",
    latestTitle: "Novidades",
    benefitsTitle: "Como funciona",
    benefits: [
      {
        title: "Fabricação em impressão 3D",
        description: "Cada produto do catálogo é produzido pela KuboStudio com tecnologia de impressão 3D.",
      },
      {
        title: "Pedido pelo WhatsApp",
        description: "Monte o carrinho no site e envie o resumo do pedido com um toque, direto para o nosso WhatsApp.",
      },
      {
        title: "Atendimento direto",
        description: "Disponibilidade, prazo de produção e forma de pagamento são confirmados diretamente com você.",
      },
    ],
    ctaTitle: "Pronto para escolher?",
    ctaDescription: "Explore o catálogo completo e monte o seu pedido.",
    orderDisclaimer:
      "Os valores são estimados. Disponibilidade, prazo e pagamento serão confirmados pela KuboStudio no WhatsApp.",
    footerAbout: "Produtos fabricados por impressão 3D. Pedidos e atendimento pelo WhatsApp.",
  },

  catalog: {
    pageSize: 12,
    featuredLimit: 8,
    relatedLimit: 4,
  },

  cart: {
    storageKey: "kubostudio:cart:v1",
    maxQuantityPerItem: 99,
    maxItems: 50,
  },
} as const

export type SiteConfig = typeof siteConfig
