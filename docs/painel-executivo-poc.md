# POC — Painel Executivo

Análise feita sobre o projeto antigo (`../sgbi`, v3.3.1) e o banco de homologação `sgbi_teste` (MySQL 5.7.44) em 30/10/2026, antes da implementação.

## 1. Como o BI antigo funciona

```
src/reports/** (tela) → Context (só filtros) → useQuery → service do front (axios /api)
  → route.ts (validateQueryParams) → service do back (quase sempre repasse)
    → Repository (query Drizzle com sql<T>) → MySQL
```

- **Dados fechados (D-1)** vêm do MySQL local, populado de madrugada pelo processo "headquarter" a partir dos `.dbf` do VX. As tabelas `view_*` são tabelas materializadas por esse processo, não views SQL.
- **Dados do dia** vêm da `API_VIEW`: `${API_VIEW}/sgsistemas/v1/sgbi/online/resumido/vendas/filiais?filiais=1,2&por=totalValorVendas&direcao=desc`, autenticada com o token da tabela `tokens` (vazia em homologação).
- Toda a regra de cálculo fica dentro das queries dos repositories. Os mais relevantes para a POC:
  - `AnaliseGerencialRepository.ts`: venda, custo e lucro por nível mercadológico.
  - `ParfilRepository.ts`: ticket médio e cesta média.
  - `modules/compras/resumo-compras-vendas/PurchaseSalesSummaryRepository.ts`: compra sobre venda por nível.
  - `modules/comparativos/ExpensesComparisonRepository.ts`: despesas, lucro e despesa sobre faturamento.
  - `modules/vendas/metas-realizado/MetasRealizadoNeedleRepository.ts`: realizado vs meta.
  - `modules/produtos/cancelamento-por-operador/CancelamentoPorOperadorRepository.ts`: cancelamentos.
- O schema Drizzle antigo usa `date(..., { mode: 'string' })`. Precisamos manter isso: o servidor está em UTC e o mysql2 devolve `Date` deslocado (por exemplo, `2026-07-01T03:00:00Z`).

## 2. Tabelas que a tela usa

| Tabela | Conteúdo | Cobertura em homologação |
|---|---|---|
| `view_analise_gerencial_produtos` | Fato diário por produto e filial: `totalVenda` (= `totalPDV` + `totalFaturamento`), `totalCusto` (= `totalCustoPDV` + `totalCustoFaturamento`), `totalCompra`, nível mercadológico. Em homologação o faturamento está zerado | 26/08/2025 a 15/09/2026, **com buracos** em 14–23/08 e 25–30/08/2026 |
| `parfil` | Consolidado diário por filial (só PDV): `totvrvenda`, `totvrcusto`, `nclientes` (tickets), `sku` | Até 12/08/2026 |
| `logpdv` | Item a item do PDV (7,6 milhões de linhas): `valorTotal`, `valorDesconto`, `cupomCancelado` | 28/08/2025 a 12/08/2026 |
| `cancelamentos` | Cancelamentos por produto, operador e motivo (`valor_total_cancelamento`) | 28/08/2025 a 12/08/2026 |
| `despesa` + `tipo_despesa` | Despesas por filial e tipo | **Só de 13/08 a 03/09/2026** (193 registros; cerca de 14% sem tipo) |
| `previsao_dia` / `previsao_filial` / `previsao_departamento` | Metas de venda e lucro | **Só abril e maio de 2025**, sem sobreposição com as vendas |
| `view_11_departamentos` / `_grupos` / `_subgrupos` | Hierarquia: departamento → grupo → subgrupo | 17 departamentos, 83 grupos, 469 subgrupos |
| `filiais` | Cadastro de filiais | 18 cadastradas; só 1, 2, 3, 7, 11, 14 e 17 têm movimento |

Observações sobre o dicionário enviado (`message.json`):

- O `logpdv` no banco tem colunas que não estão no dicionário, mas estão no schema antigo: `valorTotal`, `valorDesconto`, `valorCancelado`, `valorTotalCancelado`.
- A tabela `cancelamentos` não aparece no dicionário.
- No `logpdv`, `valorTotalCancelado` está zerado. Os cancelamentos precisam vir da tabela `cancelamentos`.
- A tabela `compras` tem só 2 dias de dados. Para compras, usar `view_analise_gerencial_produtos.totalCompra`, como o BI antigo já faz.

## 3. Elementos da tela e fonte de cada dado

✅ temos dado e lógica · ⚠️ temos, com ressalva · ❌ falta dado em homologação · ⚙️ regra configurável · ⏸️ decisão adiada

Coluna **Origem**: quais KPIs respeitam o filtro PDV / Faturamento (decisão 2).

| Elemento | Fonte e cálculo | Origem | Status |
|---|---|---|---|
| Filtro Período | `between(data, ini, fim)` | — | ✅ |
| Comparar com: mesmo período anterior | Mesmo número de dias imediatamente antes (ou mesmo período do ano anterior) | — | ✅ |
| Filtro Filial | `filiais` (exibir só as que têm movimento) | — | ✅ |
| **Venda** | `sum(totalVenda)` da analise gerencial + sparkline diária | Filtro | ✅ |
| **Lucro Bruto** | `sum(totalVenda) - sum(totalCusto)` | Filtro | ✅ |
| **Margem Bruta** | lucro / venda (em p.p. contra o período anterior) | Filtro | ✅ |
| **Despesas Operacionais** | `sum(despesa.valor)`, % da venda | — | ⚠️ só 13/08 a 03/09/2026 (qualidade vai popular) |
| **Resultado Operacional** | lucro bruto - despesas (já existe em `ExpensesComparisonRepository`) | Filtro (lucro) | ⚠️ depende das despesas |
| **Venda vs Meta** | realizado / `sum(previsao_dia.previsao_venda)` | Filtro (realizado) | ❌ metas só de 04–05/2025 (qualidade vai popular) |
| **Ticket Médio** | Venda PDV ÷ cupons do `logpdv` (até 04/11/2026 era o `parfil`, que soma cerca de metade da venda; D42) | Só PDV | ✅ até 12/08/2026 (base PDV) |
| **Compra sobre Venda** | `sum(totalCompra) / sum(totalVenda)` | Filtro (venda) | ✅ |
| **Cancelamentos** | `sum(cancelamentos.valor_total_cancelamento)`, % da venda | Só PDV | ✅ até 12/08/2026 |
| **Descontos** | `sum(logpdv.valorDesconto)` sem cupom cancelado; "venda bruta" = venda + descontos | Só PDV | ⏸️ em aberto: consulta lenta (cerca de 34 s por mês) |
| Evolução da Venda (diária, semanal, mensal) | analise agrupada por dia, atual vs anterior | Filtro | ✅ |
| Evolução da Margem Bruta | idem, lucro / venda por dia | Filtro | ✅ |
| Venda vs Meta (acumulado), média diária necessária, dias restantes | (meta do mês - realizado) / dias restantes | Filtro (realizado) | ❌ falta meta |
| Tabela Compra sobre Venda por Departamento, Grupo e Subgrupo | analise + `view_11_*`, com variação contra o período anterior (lógica de `PurchaseSalesSummaryRepository`) | Filtro (venda) | ✅ |
| Coluna "Situação" (Bom / Atenção / Crítico) | **Não existe no BI antigo.** Regra provisória na seção 6 | — | ⚙️ configurável |
| Alertas e Pontos de Atenção | **Não existe no BI antigo.** Regras provisórias na seção 6 | — | ⚙️ configurável |

## 4. Riscos e inconsistências de dados

1. **Analise gerencial e `parfil` não batem, e a causa ainda é desconhecida**. Em julho/2026 a filial 1 soma R$ 2,32 milhões na analise e R$ 1,10 milhão no `parfil`, mesmo com faturamento zero (a primeira versão desta análise atribuía a diferença ao faturamento, o que estava errado). A filial 3 aparece no `parfil` mas não na analise; a filial 11 aparece na analise com venda zero. Precisa ser investigado com quem conhece a carga do headquarter. Enquanto isso, o Ticket Médio (base `parfil`) não fecha com o card Venda (base analise).
2. **Janelas desalinhadas**. Nenhum período cobre todas as fontes ao mesmo tempo.
   - **Julho/2026 contra junho/2026**: tudo completo, exceto despesas e metas.
   - **13/08 a 03/09/2026**: tem despesas, mas a analise tem buracos e não há `parfil`, `logpdv` nem cancelamentos.
3. **Performance do `logpdv`**. A soma de descontos por mês leva cerca de 34 s, mesmo com o índice `(filial, dataVenda)`. Opções: índice de cobertura, tabela diária pré-agregada ou cache no servidor (`use cache` com `cacheLife`), já que os dados são D-1. A analise gerencial de 2 meses responde em cerca de 4 s.
4. **Dados do dia**. Ficam fora da POC; o token da `API_VIEW` não está populado em homologação. A POC trabalha só com dias fechados.

## 5. Estilo visual do BI antigo

Origem: `tailwind.config.js` e `src/app/style.css` do projeto antigo. A base é shadcn com tokens HSL.

| Token | Valor (claro) | Uso |
|---|---|---|
| `--background` | `hsl(220 60% 97%)` | Fundo da página, liso (o padrão de linhas onduladas do BI antigo foi removido no v2) |
| `--foreground` | `hsl(220 15% 25%)` | Texto |
| `--card` | `#fff` | Cards: `rounded-2xl border shadow-md` |
| `--primary` / `header-blue` | `hsl(219 100% 65%)` = `#4B8CFF` | Ações, aba ativa, série "atual" |
| `--muted-foreground` | `hsl(220 15% 45%)` | Legendas e "vs período anterior" |
| `--border` | `hsl(220 20% 88%)` | Bordas |
| `--radius` | `0.5rem` | Raio base |
| `--chart-1…8` | azul 219, rosa 330, roxo 270, verde 130, laranja 35, amarelo 55, lima 85, vermelho 0 | Séries dos gráficos |
| Status | success `#2e7d32`, error `#d32f2f`, warning `#ed6c02`, info `#0288d1` | Variações e situação |
| Destaques | `positive-highlight #e3fdee`, `negative-highlight #ffe0e0` | Fundo de células positivas e negativas |
| Pares pastel `summary-*` | fundo `hsl(H 84–100% 94%)` + ícone `hsl(H 55–70% 40–55%)` (green, blue, pink, purple, orange, gold, teal, coral) | Fundo dos ícones dos KPIs |

- Fonte: **Inter**.
- Títulos de card: `text-2xl font-semibold`.
- O CSS antigo tinha um bloco `.dark`, mas o BI nunca ofereceu tema escuro. **O v2 tem tema escuro** (implementado em `src/app/globals.css`, alternado com `next-themes`).
- Cores das séries no painel antigo: vendas `#5cd670`, custos `#f075b3`, lucro `#f6b355`.
- Navegação: no BI antigo é uma barra superior azul `#4B8CFF` de 60px (`Menu/index.tsx`). **No v2 virou uma barra lateral recolhível** na mesma cor (pedido do coordenador em 30/10/2026, para ganhar altura): recolhida por padrão, só com ícones; no celular vira um menu deslizante. O print serve só como referência de quais dados a tela mostra.

## 6. Decisões (30/10/2026)

> Lista consolidada de decisões e perguntas em aberto: [`decisoes-e-pendencias.md`](decisoes-e-pendencias.md).

1. **Situação e Alertas**: ainda sem regra de negócio. Vão ficar em um arquivo de configuração, fácil de alterar. Valores provisórios:
   - Situação da compra sobre venda, pela variação em p.p. contra o período anterior: até 2 p.p. = Bom; acima de 2 até 6 p.p. = Atenção; acima de 6 p.p. = Crítico.
   - Alertas: departamento Crítico; margem bruta caindo 0,5 p.p. ou mais; despesas sobre a venda subindo 0,5 p.p. ou mais; cancelamentos subindo 10% ou mais; descontos subindo 5% ou mais.
2. **PDV e faturamento**: filtro **Origem** com três opções (PDV + Faturamento, só PDV, só Faturamento). KPIs de base PDV (Ticket Médio, Cancelamentos, Descontos) ignoram o filtro e indicam "PDV" na tela. Equivalente ao botão "Por PDV / Total" do BI antigo (`components/SwitchInvoice`).
3. **Venda bruta** (card Descontos) = venda + descontos.
4. **Metas e despesas**: a qualidade vai popular em homologação. Até lá, esses cards mostram "sem dados no período".
5. **Visual**: manter o estilo do BI antigo, com tema escuro novo no v2.
6. **Descontos**: decisão adiada (como calcular sem a consulta de 34 s).
7. **Densidade** (pedido do coordenador, 30/10/2026): os clientes preferem ver mais informação sem rolar a tela. Barra lateral no lugar da barra superior, cards e gráficos mais baixos, KPIs numa grade de 5 × 2. Os filtros mantêm o tamanho atual. A barra lateral tem 48px e expande por cima do conteúdo. A tabela por nível e os alertas ficam numa linha redimensionável (largura e altura) que, por padrão, ocupa o resto da tela; os alertas têm rolagem própria. A página não rola em 1536 × 864 nem em 1920 × 1080.
8. **Comparar com** (30/10/2026): é um calendário próprio. Os dias do Período aparecem em laranja como referência. Atalhos que recuam a partir do Período: mesmo período anterior, semana, mês, trimestre e ano anterior. Um atalho fica relativo (acompanha o Período quando ele muda); datas escolhidas à mão ficam fixas. O servidor recebe a comparação já em datas (`comparacaoInicio`/`comparacaoFim`).

O dicionário `message.json` é antigo e serve só como apoio; a fonte da verdade é o banco e o código.

## 7. Proposta para a implementação

1. **Schema**: portar para `src/db/schema.ts` só as tabelas da seção 2, com datas em `mode: 'string'` e só as colunas usadas do `logpdv`.
2. **Camada de dados**: funções server-only por bloco da tela (KPIs, evolução, meta, departamentos, alertas), com `'use cache'`, `cacheLife` e tags por filial, período e origem, já que os dados são D-1. O React Query consome essas funções via Route Handlers, com hidratação inicial a partir de Server Components.
3. **Período de demonstração**: julho/2026 contra junho/2026, até a qualidade popular metas e despesas.

## 8. Implementação (primeira versão)

Estrutura em `src/features/painel-executivo/`:

| Arquivo | Papel |
|---|---|
| `server/data.ts` | Queries Drizzle (server-only) com `'use cache'`, `cacheLife('hours')` e tag `painel-executivo` |
| `server/params.ts` | Validação dos parâmetros das rotas (400) e tratamento de erro (500) |
| `src/app/api/painel-executivo/{series/[fonte],meta,departamentos}` e `src/app/api/filiais` (comum) | Route Handlers consumidos pelo React Query |
| `queries.ts` | `queryOptions` do React Query (chaves, `staleTime`, `keepPreviousData`) |
| `compute.ts` | Cálculos puros: KPIs, agregação dia/semana/mês, situação e alertas |
| `config.ts` | **Limites da Situação e dos Alertas** e período inicial |
| `src/lib/date.ts` / `src/lib/format.ts` (comuns) | Datas ISO em UTC e formatação pt-BR |
| `components/` | Filtros, cards de KPI, gráficos, meta acumulada, tabela e alertas |

Comportamentos:

- A rota `/series/[fonte]` (`vendas`, `pdv`, `cancelamentos`, `despesas`) devolve a série diária de uma fonte nos dois períodos. Cada fonte é uma consulta separada, então cada card aparece assim que as suas fontes chegam; o cliente combina as séries (`combinarSeries`) e calcula KPIs, minigráficos e gráficos de evolução.
- Carregamento: cada card mostra uma camada escura com desfoque e spinner (`LoadingOverlay`) no primeiro carregamento e ao trocar filtros; os dados anteriores ficam cobertos até os novos chegarem.
- Quando algum período tem dias sem venda carregada, a tela mostra um aviso de "dados incompletos", porque a variação fica distorcida (exemplo: 13/08 a 03/09/2026 tem venda em só 6 de 22 dias).
- Cards sem dados mostram "Sem dados no período" ou "sem dados no período anterior", em vez de R$ 0.
- Nenhuma rota consulta o banco durante o `next build`: o build da imagem Docker não tem acesso ao banco do cliente.
- Medição local (`next start`): 0,8 a 1,5 s na primeira consulta; cerca de 5 ms com cache.

Limitações conhecidas:

- Descontos: card "Em definição" (decisão 6).
- A lista de filiais vem da analise gerencial; a filial 3 (só no `parfil`) não aparece.
- A tabela troca de nível pelas abas, mas ainda não expande um departamento em seus grupos.
- Não há dados do dia (`API_VIEW`); a tela usa só dias fechados.
- `PERIODO_PADRAO` está fixo em julho/2026 por causa da homologação.
