# Tela de Vendas

Segunda tela do v2 (`/vendas`), feita a partir de um print de referência que define **quais dados** a tela mostra. O visual segue o padrão já definido (BI antigo + tema escuro, barra lateral, layout compacto). As decisões estão em [`decisoes-e-pendencias.md`](decisoes-e-pendencias.md) (D18 a D25) e as perguntas em aberto em P23 a P31.

## 1. Elementos da tela e fonte de cada dado

Coluna **Origem**: se o dado respeita o filtro PDV / Faturamento.

| Elemento | Fonte e cálculo | Origem |
|---|---|---|
| Filtros (Período, Comparar com, Filial, Origem) | Os mesmos do Painel Executivo (`src/components/filtros/`) | — |
| **Venda** | `sum(totalVenda)` da analise gerencial (ou `totalPDV`/`totalFaturamento`) | Filtro |
| **Margem Bruta** | (venda - custo) / venda; variação em p.p. | Filtro |
| **Lucro Bruto** | venda - custo | Filtro |
| **Ticket Médio** | `sum(logpdv.valorTotal)` / cupons | Só PDV |
| **Cupons** | Cupons distintos no `logpdv` (filial + dia + caixa + número do cupom) | Só PDV |
| **Itens por Cupom** | `sum(logpdv.quantidadeVendida)` / cupons (como a "cesta média" do BI antigo, ver P25) | Só PDV |
| Evolução das Vendas / da Margem Bruta | Analise gerencial por dia, agrupada em dia, semana ou mês, atual × comparação | Filtro |
| Vendas por Departamento | Analise gerencial por departamento: 7 maiores + "Outros"; venda ou lucro bruto, com % do total | Filtro |
| Desempenho por Departamento / Grupo / Subgrupo | Analise gerencial por nível (venda, margem, lucro, participação) + `logpdv` por nível (cupons e itens por cupom). Cada linha expande no nível de baixo | Filtro (cupons: só PDV) |
| Classificação ABC | Produtos do período ordenados por venda (faturamento) ou lucro bruto (rentabilidade); faixas A 70% e B 20% (`config.ts`) | Filtro |
| Listas de produtos | Classe ABC por faturamento + variação contra a comparação e margem bruta por produto | Filtro |

## 2. Dados e desempenho

- **`logpdv` × `parfil`:** o `logpdv` bate exatamente com a analise gerencial (filial 1 em 02/07/2026: R$ 82.244,09 nos dois); o `parfil` tem cerca de metade (R$ 40.956,60). Por isso a tela de Vendas usa o `logpdv` para cupons, e o Ticket Médio difere do Painel Executivo (que ainda usa o `parfil`, ver P6).
- **Cupons por nível:** um cupom conta em cada departamento de que comprou; o total da tabela usa os cupons distintos do período (D21).
- **Tempos medidos** em homologação (julho/2026, 6 filiais, primeira consulta, sem cache):

| Rota | Tempo |
|---|---|
| `/api/vendas/series/vendas` (analise, 2 períodos) | cerca de 2 s |
| `/api/vendas/niveis` (analise por nível, 2 períodos) | cerca de 2 s |
| `/api/vendas/produtos` (cerca de 8 mil produtos, ABC e listas) | cerca de 2 s |
| `/api/vendas/series/cupons` (`logpdv`, 2 períodos) | 13 a 15 s |
| `/api/vendas/niveis/cupons` (`logpdv` por nível, 2 períodos) | 15 a 17 s |

  Agrupar primeiro por cupom e depois por dia é bem mais rápido que `count(distinct ...)` (12 s contra 30 a 50 s). Mesmo assim, o `logpdv` precisa de uma solução definitiva (P23). Enquanto isso, as consultas de cupons são separadas e o resto da tela não espera por elas.
- **Curva ABC no servidor:** o período tem milhares de produtos; o servidor devolve só o resumo das classes, a curva amostrada (cerca de 100 pontos) e as listas (50 produtos cada).

## 3. Implementação

Estrutura em `src/features/vendas/`:

| Arquivo | Papel |
|---|---|
| `server/data.ts` | Queries Drizzle (server-only) com `'use cache'`, `cacheLife('hours')` e tag `vendas` |
| `abc.ts` | Curva ABC e listas de produtos (função pura, usada no servidor) |
| `src/app/api/vendas/{series/[fonte],niveis,niveis/cupons,produtos}` | Route Handlers consumidos pelo React Query |
| `queries.ts` | `queryOptions` (os cupons não usam a Origem na chave) |
| `compute.ts` | Combinação das séries, indicadores e linhas da tabela |
| `config.ts` | Faixas ABC, tamanho das listas e departamentos no gráfico |
| `components/` | KPIs, barras por departamento, tabela de desempenho, Curva ABC e listas de produtos |

Comportamentos:

- Cada card carrega de forma independente; as colunas de cupons da tabela mostram um spinner por célula até a consulta do `logpdv` chegar.
- Os níveis de baixo (grupo, subgrupo) só são consultados ao expandir uma linha.
- "Exportar" (tabela) e "Ver todos" → "Exportar" (listas) geram CSV para o Excel em português.
- Avisos de dados incompletos (venda ou cupons com dias sem carga) e de erro vão para o botão de avisos da barra lateral.

Limitações conhecidas:

- Primeira consulta de cupons lenta (P23).
- Sem dados do dia (API do VX).
- Em homologação o faturamento está zerado: com Origem "Faturamento", venda, ABC e listas ficam vazios.
