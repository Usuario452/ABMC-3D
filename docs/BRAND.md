# KuboStudio — Guia da marca

Referência rápida da identidade visual usada no site e no painel. Os valores abaixo são os mesmos que o código usa (`src/app/globals.css` e `src/config/site.ts`); ao mudar a marca, atualize os dois lugares.

**Conceito:** fabricação por impressão 3D. Fundo preto, texto branco e um símbolo dourado feito de facetas angulares (um "K" dobrado, como camadas de material), que também remete ao cubo de "Kubo".

---

## Arquivos do logo

Todos em `public/brand/`.

| Arquivo | Uso |
|---|---|
| `kubostudio-logo.png` | **Original**, com fundo preto. Fonte de tudo que está abaixo; não editar. |
| `kubostudio-logo-light.png` | Logo completo, fundo transparente, **texto branco**. Para fundos escuros. |
| `kubostudio-logo-dark.png` | Logo completo, fundo transparente, **texto escuro**. Para fundos claros (papel, documentos, e-mail, fundo branco). |
| `kubostudio-icon.png` | Só o símbolo, **1:1** (1024 × 1024), fundo transparente. |
| `kubostudio-icon-on-dark.png` | Só o símbolo, **1:1** (1024 × 1024), sobre o preto da marca. Para foto de perfil (WhatsApp, Instagram, etc.), que não aceitam transparência bem. |

Os quatro arquivos derivados são gerados por `npm run brand:build` (`scripts/brand-assets.mts`) a partir do original. Se o logo original mudar, rode o comando de novo.

**Limitação:** o original é uma imagem (1983 × 793 px), não um vetor. O ícone 1:1 de 1024 px é uma ampliação dele, então as bordas são levemente suaves. Para impressão em grande formato, sinalização ou bordados, peça o arquivo vetorial (SVG, AI ou PDF) a quem criou a marca e guarde-o aqui.

### Como usar

- **Fundo escuro ou foto escurecida:** `kubostudio-logo-light.png`.
- **Fundo claro:** `kubostudio-logo-dark.png`. O símbolo dourado funciona bem nos dois.
- **Espaço de respiro:** deixe ao redor do logo ao menos a altura da letra "K" do símbolo.
- **Tamanho mínimo:** 120 px de largura para o logo completo; 24 px para o símbolo sozinho.
- **Não faça:** esticar ou girar o logo, trocar as cores do símbolo, aplicar sombras ou contornos, colocar o texto branco sobre fundo claro.

---

## Cores

| Token | Valor | Uso |
|---|---|---|
| `--brand-background` | `#080808` | Fundo das páginas |
| `--brand-surface` | `#111111` | Cartões e painéis |
| `--brand-surface-elevated` | `#181818` | Campos, menus, superfícies elevadas |
| `--brand-border` | `#292929` | Bordas e divisórias |
| `--brand-foreground` | `#f7f7f7` | Texto principal |
| `--brand-muted-foreground` | `#a3a3a3` | Texto secundário |
| `--brand-gold` | `#efc326` | **Cor de destaque**: botões, links, foco |
| `--brand-gold-light` | `#fae942` | Brilho do dourado, estados de hover |
| `--brand-gold-dark` | `#ca7b17` | Sombra do dourado, gradientes |
| `--brand-success` | `#22c55e` | Confirmações |
| `--brand-destructive` | `#ef4444` | Erros e ações de exclusão |

O gradiente dourado do símbolo vai de `#fae942` (claro) a `#efc326` e `#ca7b17` (escuro), medidos no arquivo do símbolo. No código: classes `bg-gold-gradient` e `text-gold-gradient`.

**Regra de uso:** o dourado é o único destaque. Use-o em poucos pontos por tela (botão principal, ícones de ênfase, foco), nunca como cor de fundo grande.

---

## Temas (claro e escuro)

O site e o painel têm dois temas: **escuro** (o padrão) e **claro**. O tema vem da classe `dark` no `<html>`. O seletor fica no menu do usuário, no rodapé da sidebar do painel ("Tema": Claro ou Escuro); a escolha é guardada no navegador (`localStorage`) e aplicada por um script no `<head>` antes da primeira pintura, então a página não "pisca" no tema errado. O código está em `src/lib/theme.ts` e `src/lib/theme-init.ts`.

- Todos os tokens de cor ficam em `src/app/globals.css`: o bloco `:root` é o tema claro e o bloco `.dark` é o escuro. O dourado da marca (`--brand-gold*`) é igual nos dois.
- `--gold` (classes `text-gold`, `bg-gold/10`…) é o dourado de **texto e destaques**: no tema claro ele é mais escuro (`#9a6a00`) para manter o contraste.
- O logo muda sozinho: texto branco no tema escuro e texto escuro no claro (`BrandLogo`).
- **Regra:** nenhum componente usa cores fixas (hex, `bg-white`, `text-black`…). Use só os tokens (`bg-card`, `text-muted-foreground`, `border-border`, `ring-foreground/10`…), assim os dois temas funcionam sem retrabalho.

---

## Princípios visuais

O padrão visual do sistema inteiro (loja, painel e login) é o da **tela de login**:

- **Escala:** fonte-base de 16 px, títulos de página grandes (`text-3xl` a `text-4xl`), botões principais com `size="lg"` (48 px) e campos altos (48 px nos formulários de destaque).
- **Cantos:** nada passa de 12 px. `--radius` (12 px) vale para `rounded-lg`, `rounded-xl`, `rounded-2xl` e maiores; `rounded-md` fica em 8 px e `rounded-sm` em 6 px (`globals.css`). Chips e categorias usam `rounded-full`.
- **Dourado como assinatura:** brilhos dourados desfocados atrás do conteúdo (`bg-gold/10 blur-3xl`), gradiente dourado nos botões de ação principais e nos destaques (`bg-gold-gradient`, `text-gold-gradient`), ícones dentro de quadros dourados translúcidos (`bg-gold/10 text-gold`) e grade discreta de fundo (`bg-grid-faint`) nas telas de destaque.
- **Textos de apoio:** pequenos rótulos em caixa alta, dourados e com espaçamento aberto (`tracking-[0.2em]`), acima dos títulos.
- **Acabamento:** vidro fosco (`backdrop-blur`) em barras fixas e toasts, sombras suaves e elevação ao passar o mouse nos cartões clicáveis.
- **Sidebar do painel:** cartão flutuante sem borda, recolhível, com item ativo em ícone sólido e divisórias finas.
- **Avisos e erros** sempre como toast (veja o README).

---

## Tipografia

- **Fonte:** Montserrat, pesos 400, 500, 600 e 700 (carregada por `next/font/google` em `src/app/layout.tsx`).
- **Títulos:** peso 700, espaçamento levemente fechado (`tracking-tight`).
- **Textos pequenos em destaque** (por exemplo, "PRODUTOS FABRICADOS POR IMPRESSÃO 3D"): caixa alta, peso 600, espaçamento aberto (`tracking-[0.2em]`) e cor dourada.

---

## Tom de voz

Direto, próximo e prático, em português do Brasil. Fala de "pedido pelo WhatsApp", "atendimento direto" e "fabricado por impressão 3D". Os textos oficiais ficam em `src/config/site.ts` (`siteConfig.texts`).

---

## Ícones do navegador e redes

- `src/app/icon.png` e `src/app/apple-icon.png`: ícone da aba e do iPhone.
- `src/app/opengraph-image.png`: imagem exibida quando o link da loja é compartilhado.
- Foto de perfil em redes sociais e WhatsApp Business: `public/brand/kubostudio-icon-on-dark.png`.
