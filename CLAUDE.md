@AGENTS.md

# SGBI v2

Projeto de Business Intelligence em Next.js 16 (App Router, TypeScript, Tailwind CSS v4, ESLint), `src/` dir e alias `@/*`.

> Reescrita do SGBI antigo (`/home/carlosf/repositories/sgbi`). Primeira entrega: POC da tela **Painel Executivo**, com análise, decisões e mapeamento de dados em `docs/painel-executivo-poc.md`.
> O banco tem dados **até ontem**; dados do dia atual, finalizadoras, login e usuários vêm da API do VX (`API_VIEW`): ver `docs/api-externa-mapeamento.md`.

## Stack obrigatória

- **Drizzle ORM** + `mysql2` — banco **MySQL 5.7** (`sgbi_teste` em homologação). Cliente em `src/db/index.ts` (server-only), schema em `src/db/schema.ts`, config em `drizzle.config.ts`.
- **TanStack React Query v5** — provider em `src/app/providers.tsx` (montado no root layout), devtools no canto inferior direito em dev.
- **Recharts v3** — gráficos; sempre em Client Components (`"use client"`).
- **Material Community Icons** — `@mdi/react` + `@mdi/js` (`<Icon path={mdiChartBar} size={1} />`). Importe só os ícones usados de `@mdi/js`.

## Estrutura

- Cada tela fica em `src/features/<tela>/`: `server/` (queries Drizzle server-only com `'use cache'`), `queries.ts` (React Query), `compute.ts` (cálculos puros), `config.ts` (regras de negócio ajustáveis) e `components/`.
- Route Handlers em `src/app/api/<tela>/**/route.ts` validam parâmetros e chamam `server/`. Use o `handle()` de `server/params.ts`, que já repassa os erros internos do Next (`unstable_rethrow`).
- Nenhuma rota pode consultar o banco no `next build` (o build Docker não tem banco): rotas sem parâmetros chamam `await connection()`.
- Componentes base em `src/components/ui/` (Card, Select, Segmented, Skeleton, Field).

## Visual e tema

- O estilo segue o BI antigo (`../sgbi`): azul `#4B8CFF`, fundo liso `bg-background` (sem o padrão de linhas do BI antigo), cards `rounded-2xl border bg-card shadow-md`, fonte Inter. Prints de referência definem **quais dados** uma tela mostra, não o visual.
- Tokens em `src/app/globals.css` (nomes compatíveis com shadcn): `:root` = claro (valores do BI antigo), `.dark` = escuro (novo no v2). Use sempre as classes dos tokens (`bg-card`, `text-muted-foreground`, `bg-summary-green-bg`, `text-success`, `bg-chart-1`, `bg-header`…), nunca cores fixas, para funcionar nos dois temas.
- Layout compacto (os clientes preferem ver tudo sem rolar): `src/components/app-shell.tsx` é a barra lateral de 48px que expande **por cima** do conteúdo (não empurra o layout; fecha com clique fora/Esc; menu deslizante no celular). Espaçamento de 10px entre cards, títulos de card `text-base`, valores de KPI `text-xl`. Os filtros (`h-9`) ficam do tamanho atual.
- Painéis redimensionáveis: `src/components/ui/resizable-row.tsx` (alças de largura e altura, teclado e duplo clique para restaurar; tamanho salvo no `localStorage`). Sem ajuste salvo, a altura ocupa o resto da tela, sem rolar a página. Verifique telas novas em 1536×864.
- Tema alternado por `next-themes` (classe `.dark` no `<html>`) e `src/components/theme-toggle.tsx`. Gráficos Recharts devem usar `var(--chart-N)` e `var(--border)`.

## Ambiente

- `.env.local` (não versionado) contém as credenciais de homologação; `.env.example` documenta as variáveis.
- Variáveis: `API_VIEW` (API de views do BI antigo) e `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`.
- Acesse via `env` de `src/lib/env.ts` (server-only). Nunca exponha essas variáveis com `NEXT_PUBLIC_`.
- `cacheComponents` está habilitado no `next.config.ts`: queries que rodam no render inicial precisam ficar dentro de `<Suspense>` (ver `node_modules/next/dist/docs/01-app/02-guides/client-side-data-fetching/tanstack-query.md`).

## Comandos

- `npm run dev` — servidor de desenvolvimento (Turbopack)
- `npm run build` — build de produção
- `npm run lint` — ESLint
- `npm run db:pull` — introspecta o banco e gera schema Drizzle em `drizzle/`
- `npm run db:studio` — Drizzle Studio

## Skills do projeto (`.claude/skills/`)

Instaladas via `npx skills` e rastreadas em `skills-lock.json` (atualize com `npx skills update -p`).

- `vercel-react-best-practices` — performance de React/Next.js (data fetching, bundle, re-renders)
- `vercel-composition-patterns` — arquitetura de componentes reutilizáveis
- `web-design-guidelines` — revisão de UI/acessibilidade
- `shadcn` — componentes shadcn/ui
- `frontend-design` — direção visual de interfaces
- `data-visualization` — escolha e construção de gráficos/dashboards
- `xlsx` — leitura/geração de planilhas (import/export de dados)
- `webapp-testing` — testes da app local com Playwright
