# SGBI v2

Reescrita do **SGBI** (Business Intelligence do VX) em Next.js 16. A primeira entrega é uma POC da tela **Painel Executivo**, que reúne em uma única tela, sem rolagem, os indicadores de venda, margem, despesas, metas, compras e cancelamentos.

> **Status:** POC em homologação. As decisões tomadas e as perguntas ainda em aberto estão em [`docs/decisoes-e-pendencias.md`](docs/decisoes-e-pendencias.md).

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack, `cacheComponents`), React 19, TypeScript |
| Estilo | Tailwind CSS v4 com os tokens do BI antigo, tema claro e escuro (`next-themes`), fonte Inter |
| Banco | MySQL 5.7 via **Drizzle ORM** + `mysql2` (somente leitura) |
| Dados no cliente | **TanStack React Query v5** |
| Gráficos | **Recharts v3** |
| Ícones | **Material Design Icons** (`@mdi/react` + `@mdi/js`) |
| Componentes | Radix UI (Select, Popover, Checkbox), `react-day-picker` (calendário) e `date-fns` |

## Requisitos

- Node.js 24 (ver `.nvmrc`)
- Acesso ao MySQL do SGBI (em homologação, o banco `sgbi_teste`)
- Opcional: acesso à API de views do VX (`API_VIEW`), necessária para os dados do dia atual

## Como rodar

```bash
nvm use
npm install
cp .env.example .env.local   # preencha as credenciais
npm run dev
```

Abra http://localhost:3000. Pela rede interna, o `next dev` aceita os endereços `172.16.*.*` (configurado em `allowedDevOrigins`, no `next.config.ts`).

### Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `API_VIEW` | URL base da API de views do VX |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE` | Conexão com o MySQL |

O `.env.local` não é versionado. As variáveis são lidas só no servidor (`src/lib/env.ts`) e nunca podem usar o prefixo `NEXT_PUBLIC_`.

### Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (Turbopack) |
| `npm run build` | Build de produção (não acessa o banco) |
| `npm start` | Sobe o build de produção |
| `npm run lint` | ESLint |
| `npm run db:pull` | Introspecta o banco e gera o schema Drizzle em `drizzle/` |
| `npm run db:studio` | Drizzle Studio |

## Estrutura

```
src/
├── app/
│   ├── api/<tela>/**/route.ts   # Route Handlers: validam os parâmetros e chamam server/
│   ├── layout.tsx, providers.tsx, globals.css (tokens do tema)
│   └── page.tsx                 # Painel Executivo
├── components/
│   ├── app-shell.tsx            # Barra lateral recolhível e menu do celular
│   ├── avisos.tsx               # Botão de avisos da barra lateral (useAvisos)
│   └── ui/                      # Card, Select, Popover, Checkbox, DateRangePicker,
│                                # LoadingOverlay, ResizableRow...
├── db/                          # Cliente Drizzle (server-only) e schema
├── features/
│   └── painel-executivo/
│       ├── server/              # Queries Drizzle com 'use cache' (server-only)
│       ├── queries.ts           # queryOptions do React Query
│       ├── compute.ts           # Cálculos puros (KPIs, agregações, situação, alertas)
│       ├── config.ts            # Regras de negócio ajustáveis (limites)
│       ├── date.ts, format.ts   # Datas e formatação pt-BR
│       └── components/
└── lib/env.ts                   # Variáveis de ambiente (server-only)
docs/                            # Análises, decisões e mapeamentos
```

### Fluxo dos dados

```
Componente (useQuery) → /api/painel-executivo/... (route.ts) → server/data.ts ('use cache') → MySQL
```

- O banco tem dados **fechados até ontem** (D-1), carregados de madrugada pelo processo headquarter. Por isso as consultas ficam em cache no servidor (`cacheLife('hours')`).
- Cada fonte de dados é uma consulta separada (`/series/[fonte]`), então cada card carrega de forma independente e mostra o próprio indicador de carregamento.
- O `next build` não consulta o banco, porque o build da imagem Docker não tem acesso a ele.

## Convenções

- **Uma pasta por tela** em `src/features/<tela>/`, com a mesma divisão do Painel Executivo.
- **Visual do BI antigo:** azul `#4B8CFF`, cards `rounded-2xl`, fonte Inter. Use sempre as classes dos tokens (`bg-card`, `text-muted-foreground`...), nunca cores fixas, para funcionar nos dois temas.
- **Layout compacto:** a tela deve caber sem rolar em 1536 × 864. Verifique também em 1280, 1366 e 1920 px de largura.
- **Valores com 2 casas decimais** (moeda, %, p.p.) via `format.ts`.
- **Sem controles nativos** nos filtros (`<select>`, `<input type="date">`, checkbox): use os componentes de `src/components/ui/`.
- **Avisos** (dados incompletos, erros de carregamento) vão para o botão de avisos da barra lateral, com `useAvisos()`, e não para faixas no topo da tela.

Os detalhes ficam em [`CLAUDE.md`](CLAUDE.md), que também orienta o Claude Code neste projeto.

## Padrão de commit

Mesmo padrão do SGBI antigo, com o número da Ordem de Serviço:

```
1649584 - feat: Descrição curta da alteração
----------------------
- Item alterado
- Outro item alterado
----------------------
Ordem-Servico: SGPS-1649584
```

Tipos: `feat`, `fix`, `docs`, `chore`, `refactor`.

## Documentação

| Documento | Conteúdo |
|---|---|
| [`docs/decisoes-e-pendencias.md`](docs/decisoes-e-pendencias.md) | Decisões tomadas e pontos de alinhamento em aberto |
| [`docs/painel-executivo-poc.md`](docs/painel-executivo-poc.md) | Análise do BI antigo, tabelas, fonte de cada dado, riscos e implementação da POC |
| [`docs/api-externa-mapeamento.md`](docs/api-externa-mapeamento.md) | Rotas da API do VX usadas pelo BI antigo e impacto no v2 |

## Problemas conhecidos

- **CSS desatualizado no `next dev`:** às vezes o Turbopack continua servindo uma versão antiga do `globals.css`. Pare o servidor, apague `.next/dev/cache/turbopack` e suba de novo.
- **Homologação:** metas e despesas ainda não cobrem o período com vendas, e a API do VX não tem vendas do dia. Os detalhes estão em `docs/painel-executivo-poc.md`, seção 4.
