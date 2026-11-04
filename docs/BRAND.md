# ABMC 3D — Guia da marca

Referência rápida da identidade visual usada no site e no painel. Os valores abaixo são os mesmos que o código usa (`src/app/globals.css` e `src/config/site.ts`); ao mudar a marca, atualize os dois lugares.

**Conceito:** soluções em impressão 3D. Logo com o cubo da ABMC 3D e destaque em prata.

---

## Arquivos do logo

Todos em `public/brand/`, com fundo transparente.

| Arquivo | Uso |
|---|---|
| `abmc-logo-light.png` | Logo horizontal, **texto claro**. Para fundos escuros. |
| `abmc-logo-dark.png` | Logo horizontal, **texto escuro**. Para fundos claros. |
| `abmc-logo-stacked-light.png` | Logo empilhado, texto claro. |
| `abmc-logo-stacked-dark.png` | Logo empilhado, texto escuro. |
| `abmc-icon.png` | Só o símbolo (cubo), 1:1. |
| `abmc-icon-on-dark.png` | Só o símbolo, 1:1, sobre fundo escuro. Para foto de perfil (WhatsApp, Instagram, etc.). |

### Como usar

- **Fundo escuro ou foto escurecida:** `abmc-logo-light.png`.
- **Fundo claro:** `abmc-logo-dark.png`.
- **Não faça:** esticar ou girar o logo, trocar as cores do símbolo, aplicar sombras ou contornos, colocar o texto claro sobre fundo claro.

---

## Cores

A cor de destaque da marca é **prata**. Os tokens mantêm o nome `--brand-gold*` do kit original para não mexer nos componentes.

| Token | Valor | Uso |
|---|---|---|
| `--brand-gold` | `#b9bec5` | **Cor de destaque**: botões, links, foco |
| `--brand-gold-light` | `#e6e9ed` | Brilho do prata, estados de hover |
| `--brand-gold-dark` | `#7a7f88` | Sombra do prata, gradientes |
| `--gold` (tema claro) | `#5d626a` | Prata de texto e ícones, mais escuro para manter o contraste |

Fundos, superfícies, bordas e textos de cada tema estão em `src/app/globals.css` (`:root` para o claro e `.dark` para o escuro).

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
- Foto de perfil em redes sociais e WhatsApp Business: `public/brand/abmc-icon-on-dark.png`.
