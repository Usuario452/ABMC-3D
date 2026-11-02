# KuboStudio — Catálogo

Catálogo de produtos impressos em 3D com carrinho, finalização de pedidos pelo WhatsApp e painel administrativo.

- **Stack:** Next.js 16 (App Router, Cache Components, React Server Components), TypeScript estrito, Tailwind CSS 4, shadcn/ui (Radix), React Icons, PostgreSQL puro (`postgres.js`, SQL direto, sem ORM), login próprio do painel, Cloudflare R2 (imagens), sharp, Zod, React Hook Form, ESLint e Vitest.
- **Sem pagamentos online:** o cliente monta o carrinho e envia o pedido pelo WhatsApp. Disponibilidade, prazo e pagamento são combinados diretamente com a KuboStudio.

---

## Sumário

1. [Funcionalidades](#funcionalidades)
2. [Requisitos](#requisitos)
3. [Ambiente local](#ambiente-local)
4. [Banco de produção](#banco-de-produção)
5. [Criação do administrador](#criação-do-administrador)
6. [Variáveis de ambiente](#variáveis-de-ambiente)
7. [Comandos](#comandos)
8. [Arquitetura e segurança](#arquitetura-e-segurança)
9. [Testes](#testes)
10. [Hospedagem e custos](#hospedagem-e-custos)
11. [Limitações conhecidas](#limitações-conhecidas)

---

## Funcionalidades

**Loja pública**

- Página inicial com apresentação, categorias, destaques (ou novidades, se não houver destaques) e "como funciona". Seções sem conteúdo cadastrado são ocultadas.
- Catálogo com busca por nome, filtro por categoria, ordenação (nome, preço, mais recentes), paginação e estados de carregamento, erro e vazio.
- Página de produto com galeria, preço, disponibilidade, quantidade, adicionar ao carrinho com feedback e produtos relacionados.
- Carrinho salvo no navegador (sincronizado entre abas), com quantidades limitadas a 1–99, subtotais e total.
- Antes de exibir e antes de finalizar, o carrinho é revalidado no servidor: preços atuais vêm do banco, e itens removidos/inativos/indisponíveis são sinalizados e excluídos do pedido.
- Finalização pelo WhatsApp com mensagem formatada (identificação da loja, itens, quantidades, preço unitário, subtotal e total estimado). Sem número configurado, a loja exibe um aviso em vez de gerar um link inválido.
- SEO: metadados, Open Graph, `sitemap.xml` e `robots.txt`.

**Painel administrativo (`/admin`)**

- Login próprio (e-mail e senha com hash scrypt), sessão de 7 dias guardada no banco e validada no servidor a cada requisição, logout e tratamento de sessão expirada.
- Limite de tentativas de login por e-mail (8 falhas em 15 minutos).
- Dashboard com contagens reais (produtos, produtos ativos, categorias).
- Produtos: criar, editar, excluir (com confirmação), slug automático editável, preço em reais (salvo em centavos), categoria, ativo, disponível, destaque.
- Imagens: upload múltiplo (JPEG, PNG, WebP), conversão no servidor para WebP otimizado (sharp, máx. 1600 px, rotação EXIF corrigida, metadados removidos) e armazenamento no Cloudflare R2, validação de tipo real e tamanho no servidor, nomes de arquivo gerados no servidor, ordenação, imagem principal, texto alternativo e remoção.
- Categorias: criar, editar nome/slug, ativar/desativar e excluir (bloqueado quando há produtos vinculados).

---

## Requisitos

- Node.js 22.18 ou superior (os scripts de banco usam a execução nativa de TypeScript do Node).
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) para o PostgreSQL local.
- Qualquer PostgreSQL 15+ em produção (Supabase usado só como banco, Neon, servidor próprio…).

---

## Ambiente local

```bash
npm install
```

```bash
npm run db:up
```

```bash
npm run db:migrate
```

```bash
npm run db:seed:dev
```

```bash
npm run dev
```

- `db:up` sobe o PostgreSQL do `docker-compose.yml` em `127.0.0.1:5433` (dados no volume `kubostudio-db`).
- `db:migrate` aplica `db/migrations/*.sql` em ordem; cada arquivo roda uma única vez (registro em `schema_migrations`).
- `db:seed:dev` cria o administrador de desenvolvimento. O e-mail e a senha estão em `db/seed/dev.sql`. O script recusa qualquer banco que não seja local.
- Loja em `http://localhost:3000`; painel em `http://localhost:3000/admin`.
- `npm run preview` gera o build de produção e o serve com `next start`, para testar localmente exatamente como roda em produção.

---

## Banco de produção

O app usa **somente a conexão PostgreSQL** (`DATABASE_URL`). Nenhum recurso específico de provedor é usado: trocar de provedor é mudar a URL e rodar as migrations.

1. Crie o banco no provedor e copie a connection string. Em hospedagem serverless (Vercel), use a URL do **pooler em modo transaction**. No Supabase: **Connect → Transaction pooler** (porta `6543`).
2. Cole no `.env` como `DATABASE_URL=...`.
3. Aplique as migrations e crie o administrador. A senha é digitada no terminal, sem eco, e só o hash vai para o banco:

```bash
npm run db:migrate
```

```bash
npm run db:create-admin
```

Rodar `db:create-admin` de novo com o mesmo e-mail redefine a senha e encerra as sessões abertas.

**Proteção contra APIs do provedor:** a migration `0002_block_external_api.sql` ativa RLS sem políticas em todas as tabelas e revoga as permissões dos papéis `anon`/`authenticated` quando existem. No Supabase, isso impede que a Data API (chave pública) leia ou grave qualquer tabela. O app não é afetado, pois conecta como dono das tabelas. Em um Postgres puro, não tem efeito. Se quiser, desligue também a Data API no painel do Supabase.

### Imagens no Cloudflare R2

As imagens dos produtos ficam no **Cloudflare R2** (sem cobrança de tráfego de saída); o banco guarda apenas o caminho de cada arquivo.

1. Cloudflare → **R2 Object Storage** → crie o bucket (ex.: `kubostudio-images`). Ele pode ficar **privado**.
2. **R2 → Manage API tokens** → crie um token **Object Read & Write** restrito ao bucket.
3. Preencha `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID` e `R2_SECRET_ACCESS_KEY`. As chaves `R2_*` ficam só no servidor. Use o mesmo bucket em todos os ambientes que compartilham o banco.

**Como as imagens são exibidas:**

- **Bucket privado (padrão, `NEXT_PUBLIC_IMAGES_BASE_URL` vazia):** o servidor gera URLs assinadas (Signature V4) válidas por 7 dias, sempre com a data do início do dia, para o endereço não mudar ao longo do dia e os caches continuarem valendo. Como as páginas em cache duram no máximo 1 dia, o link entregue nunca está vencido. A prévia ao compartilhar um produto (Open Graph) usa a rota `/img/products/...`, de endereço fixo, que lê o arquivo do bucket pelo servidor.
- **Bucket público (quando escalar):** ative um **Custom Domain** no bucket (passa pelo cache da Cloudflare) e preencha `NEXT_PUBLIC_IMAGES_BASE_URL` com ele. As imagens passam a usar esse endereço fixo, sem nenhuma mudança de código. O `r2.dev` também funciona, mas é limitado e serve só para testes.

Não é preciso configurar CORS: o upload passa pelo servidor (Server Action) e a exibição usa `<img>`/`next/image`.

No envio, o servidor converte qualquer JPEG/PNG/WebP para **WebP qualidade 82** (até 1600 px, sem ampliar, transparência preservada) com `sharp`. Uma foto de celular de 3–5 MB costuma virar 150–400 KB.

---

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | Sim | Conexão PostgreSQL. **Secreta**, somente no servidor |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Sim, para finalizar pedidos | Somente números, com DDI 55 + DDD + número. Ex.: `5511999999999` |
| `NEXT_PUBLIC_SITE_URL` | Recomendada em produção | URL pública do site (SEO, sitemap, Open Graph) |
| `R2_ACCOUNT_ID`, `R2_BUCKET` | Sim, para imagens | Conta e bucket do R2 |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Sim, para imagens | Token do R2 (envia e assina as URLs). **Secretas**, somente no servidor |
| `NEXT_PUBLIC_IMAGES_BASE_URL` | Não | Domínio público do bucket. Vazia = bucket privado com URLs assinadas |

- Variáveis `NEXT_PUBLIC_*` vão para o navegador e não podem conter segredos. `DATABASE_URL` e `R2_*` nunca levam esse prefixo.
- Um único `.env` (ignorado pelo Git) serve para desenvolvimento, `npm run preview` e os comandos `db:*`; o Next o lê tanto em `next dev` quanto em `next start`. Numa VPS, basta copiar o mesmo arquivo. Na Vercel, cadastre as mesmas variáveis no painel do projeto (Settings → Environment Variables).
- Variáveis `NEXT_PUBLIC_*` são incorporadas no **build**: após alterá-las, gere o build novamente ou reinicie `npm run dev`.
- Sem `DATABASE_URL`, as páginas exibem um aviso de **configuração pendente** (sem revelar valores).

---

## Comandos

```bash
npm install
```

```bash
npm run dev
```

Abre em `http://localhost:3000` (loja) e `http://localhost:3000/admin` (painel).

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Servidor de produção (após o build) |
| `npm run preview` | Build de produção + `next start`, para testar localmente como em produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | Gera os tipos de rotas e roda `tsc --noEmit` |
| `npm run test` | Testes automatizados (Vitest) |
| `npm run check` | typecheck + lint + test + build |
| `npm run db:up` / `db:down` | Sobe / para o PostgreSQL local (Docker) |
| `npm run db:migrate` | Aplica as migrations no banco do `.env` |
| `npm run db:seed:dev` | Cria o administrador de desenvolvimento (só em banco local) |
| `npm run db:create-admin` | Cria administrador ou redefine senha (banco do `.env`) |

### Testando de ponta a ponta

1. Siga "Ambiente local" (banco, migrations e administrador de desenvolvimento) e preencha o R2 no `.env`.
2. `npm run dev` e acesse `/admin/login`.
3. Crie uma categoria, depois um produto; na tela do produto, envie imagens e defina a principal.
4. Abra a loja, adicione o produto ao carrinho, recarregue a página (o carrinho deve persistir) e clique em **Finalizar pelo WhatsApp**.
5. No painel, desative o produto e volte ao carrinho: ele deve aparecer como indisponível e ficar fora do pedido.

---

## Arquitetura e segurança

```
src/
  app/(site)/          Loja: início, catálogo, produto, carrinho
  app/admin/           Login, painel indisponível e painel (grupo (painel) protegido)
  actions/             Server Actions (auth, categorias, produtos, imagens, carrinho)
  components/          UI (shadcn/ui em components/ui) e componentes da loja/painel
  config/site.ts       Configuração central: marca, textos, SEO, limites
  lib/                 Banco (db.ts), autenticação, dados, validação (Zod), carrinho, WhatsApp, R2
  proxy.ts             Redireciona para o login quem acessa /admin sem cookie de sessão
  types/catalog.ts     Tipos das tabelas e dos dados da loja
db/migrations/         Esquema em SQL puro (aplicado por scripts/db-migrate.mts)
db/seed/dev.sql        Administrador de desenvolvimento (somente banco local)
scripts/               Migrations, seed local e criação de administrador
tests/                 Testes unitários e de banco (PGlite)
```

- **Sessão:** o cookie `kubo_admin_session` (httpOnly, `SameSite=Lax`, `Secure` em produção) guarda um token aleatório de 256 bits; o banco guarda só o SHA-256 dele, então um vazamento do banco não expõe sessões válidas. Logout e redefinição de senha apagam as sessões.
- **Autorização no servidor:** `proxy.ts` só redireciona quem não tem o cookie. A sessão é validada no banco pelo layout do painel, por cada página e por **cada Server Action** (`authorizeAdminAction`). Um cookie forjado não passa.
- **Senhas:** hash scrypt (N=2^15) com sal aleatório e comparação em tempo constante. E-mail inexistente também passa pelo cálculo do hash, para que o tempo de resposta não revele quais e-mails existem.
- **SQL:** todas as consultas usam parâmetros do `postgres.js` (sem concatenação de texto). Ordenações e colunas vêm de listas fixas no código.
- **Vitrine:** as consultas públicas aplicam os filtros de visibilidade (produto ativo e disponível, de categoria ativa) e ficam em cache no servidor (`"use cache"`, tag `catalog`). Toda alteração no painel invalida o cache imediatamente.
- **Carrinho:** o navegador guarda os itens com uma prévia (nome, preço e imagem) apenas para exibição; o servidor recebe somente ids e quantidades, valida com Zod, busca preços atuais e monta a mensagem do WhatsApp.
- **Imagens:** tipo real verificado pelos bytes do arquivo, limite de tamanho no servidor e no bucket, nomes gerados no servidor, caminho obrigatório `products/<id-do-produto>/...` (restrição no banco). Toda imagem é recodificada para WebP no servidor (o arquivo original nunca é armazenado). Falhas no registro desfazem o upload; ao excluir, o registro sai primeiro e depois o arquivo é apagado do R2.
- **Avisos e erros:** sempre como toast (Sonner, `Toaster` no layout raiz), nunca como caixa de alerta dentro da página. Ações do painel e do carrinho usam `toast` direto; páginas renderizadas no servidor usam `<ToastOnMount>` (`src/components/shared/toast-on-mount.tsx`) e `<ConfigToast>` para variáveis de ambiente ausentes. Estados vazios e falhas de carregamento com botão de tentar novamente seguem como `StateMessage`, e erros de campo continuam abaixo do próprio campo.
- **Ícones:** somente React Icons (`react-icons/hi2` e `react-icons/fa6` para a marca do WhatsApp). Os componentes do shadcn/ui foram ajustados para não depender de `lucide-react`. Ao adicionar novos componentes com `npx shadcn add`, substitua os imports de `lucide-react` por React Icons e remova a dependência caso ela seja instalada.
- **Marca:** o kit completo (logo com texto claro e escuro, símbolo 1:1, cores, tipografia e regras de uso) está em `public/brand/` e `docs/BRAND.md`. `kubostudio-logo.png` é o original, sem alterações; as demais versões são geradas por `npm run brand:build`. O componente `BrandLogo` usa o logo transparente. Os ícones do navegador (`src/app/icon.png`, `apple-icon.png`) e a imagem de compartilhamento (`opengraph-image.png`) foram gerados a partir do logo original.
- **Tema:** cores da marca centralizadas em `src/app/globals.css` (`--brand-*`) e mapeadas para os tokens do shadcn/ui. Tipografia Montserrat via `next/font/google` (baixada no build e servida pelo próprio site).

---

## Testes

```bash
npm run test
```

- `tests/unit/` — formatação e conversão de preços, slug, mensagem do WhatsApp, regras do carrinho, validação Zod, detecção do tipo de imagem, caminhos de arquivo, conversão para WebP, hash de senha e validação de ambiente.
- `tests/db/migrations.test.ts` — executa **as migrations reais** em um PostgreSQL embutido ([PGlite](https://pglite.dev)) e verifica: restrições do esquema, trigger de `updated_at`, bloqueio de exclusão de categoria com produtos, exclusão em cascata das imagens, função de reordenação, regras de administradores e sessões, e o bloqueio de acesso de outros papéis (RLS sem políticas).

---

## Hospedagem e custos

Os termos dos planos gratuitos mudam com frequência — **confirme as condições atuais antes de publicar**.

**PostgreSQL**

- Qualquer provedor serve. No **Supabase (Free)**: 500 MB de banco, mas **o projeto é pausado após cerca de 7 dias sem acesso** e precisa ser reativado no painel. No **Neon (Free)**: o banco "dorme" sem uso e acorda sozinho na próxima consulta. Para migrar entre eles: `pg_dump` do banco atual, troca da `DATABASE_URL` e `npm run db:migrate`.

**Cloudflare R2**

- Plano gratuito mensal (verifique os valores atuais): 10 GB armazenados, 1 milhão de operações de escrita e 10 milhões de leitura; **tráfego de saída gratuito**. Exige ativar a assinatura do R2 (cobra apenas o que exceder).
- Em produção, use um domínio próprio no bucket: a URL `r2.dev` tem limite de requisições e não usa o cache da Cloudflare.

**Hospedagem do Next.js**

- O plano **Hobby da Vercel é restrito a uso pessoal e não comercial**; para a loja, use um plano que permita uso comercial.
- Alternativas com plano gratuito que oferecem suporte a Next.js (Netlify, Cloudflare via OpenNext, entre outras) têm cotas de requisições, funções e otimização de imagens. Confira se o plano escolhido permite uso comercial e suporta os recursos usados aqui (Server Actions, Proxy e Cache Components).
- O cache da vitrine (`"use cache"`) é mantido em memória por instância. Em hospedagens com várias instâncias, alterações feitas no painel aparecem imediatamente na instância que processou a ação e, nas demais, em até 5 minutos (perfil `catalog` em `next.config.ts`).

---

## Limitações conhecidas

- **Produtos indisponíveis ficam ocultos na loja.** Visitantes só veem produtos ativos **e** disponíveis. Por isso, a indicação "Indisponível" aparece para o cliente no carrinho (quando um produto deixa de estar disponível depois de adicionado), e não no catálogo.
- O carrinho é por navegador/dispositivo (localStorage), conforme o escopo. Pedidos não são gravados no banco.
- O painel tem um único nível de acesso: todo administrador cadastrado pode tudo.
- O limite de tentativas de login é por e-mail, não por IP.
