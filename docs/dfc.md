# Financeiro · DFC (Demonstração dos Fluxos de Caixa)

Quinta tela do v2 (`/financeiro/dfc`), segunda do módulo Financeiro (abas Fluxo de Caixa e DFC no cabeçalho). Feita a partir de um print de referência que define **quais dados** a tela mostra. Decisões em [`decisoes-e-pendencias.md`](decisoes-e-pendencias.md) (D37 a D40) e perguntas em aberto em P51 a P57.

## 1. Fonte: DRE gerencial do VX (`view_dre`)

O banco não tem movimento de caixa suficiente para uma DFC por caixa (títulos mínimos, sem saldos nem vendas por finalizadora; ver P42, P44 e P47). A fonte com volume e histórico é a `view_dre`:

- DRE mensal por filial (em homologação: set/2024 a set/2026, filiais 1, 2, 3 e 11), montada pelo VX.
- `id_geral` hierárquico: 2 dígitos = linha principal (01 Receita Bruta, 02 Deduções, 04 CMV, 06 Outros Recebimentos, 07 Outras Deduções, 08 Despesas), 5 = grupo, 8 = subgrupo de despesa, 13 = item.
- Os subgrupos fecham com os totais (ex.: jul/2026, despesas R$ 510.805 = deduções + operacionais + não operacionais + IRPJ/CSLL + destinação do lucro).

Por isso a tela é uma **DFC gerencial estimada pela DRE** (regime de competência, P51), e o popup de avisos deixa isso claro.

## 2. Mapeamento DRE → DFC (`src/features/dfc/config.ts`)

| Atividade | Linha da DFC | Códigos da DRE |
|---|---|---|
| Operacional (entrada) | Vendas no PDV / faturadas | `01001` / `01002` |
| Operacional (entrada) | Outros recebimentos | `06` |
| Operacional (saída) | Fornecedores (pelo CMV, P53) | `04` |
| Operacional (saída) | Pessoal e encargos | `08002002` |
| Operacional (saída) | Despesas operacionais | `08002` (exceto pessoal) |
| Operacional (saída) | Impostos e taxas | `08001`, `08004` |
| Operacional (saída) | Devoluções e descontos de vendas | `02` |
| Operacional (saída) | Outras deduções | `07` (exceto juros) |
| Operacional (saída) | Outras despesas não operacionais | `08003` sem linha própria |
| Investimento | Investimentos / Ativo imobilizado | `08003009` / `08003015` |
| Financiamento | Despesas financeiras | `08003010`, `07002` |
| Financiamento | Participações e distribuição de lucros | `08005` |
| Fora da DFC | Perdas de mercadoria (sem saída de caixa) | `08003011` |

O prefixo mais longo vence. Cada linha abre os grupos/subgrupos da DRE que a compõem, e os subgrupos de despesa abrem os itens.

## 3. Tela

- **KPIs**: Entradas, Saídas e Geração Líquida, contra o mês de comparação. Saldo inicial e final: "não integrado" (P42).
- **DFC Gerencial**: por atividade, com mês, comparação, variação e % sobre as entradas operacionais. Modos: Valores, % do Total e Acumulado no ano (janeiro até o mês, contra janeiro até o mês de comparação). Exportação CSV.
- **Evolução da geração de caixa**: entradas, saídas e geração líquida dos 12 meses (geração em eixo próprio à direita). Só mensal (P54).
- **Composição das entradas e saídas**: roscas por linha da DFC no mês.
- **Saldo por conta financeira**: "não integrado" (P42).
- **Movimentações relevantes**: as 50 maiores do mês em cartões (por dia e empresa), contas a receber e a pagar (P56).

## 4. Implementação

| Arquivo | Papel |
|---|---|
| `src/features/dfc/server/data.ts` | Queries (server-only, `'use cache'`, tag `dfc`): opções (meses, filiais com DRE), DRE e movimentações |
| `src/features/dfc/config.ts` | Mapeamento DRE → DFC, linhas fora da DFC e tamanhos |
| `src/features/dfc/compute.ts` | Montagem da DFC (mês ou acumulado), meses e evolução de 12 meses |
| `src/app/api/dfc/{opcoes,dre,movimentacoes}` | Route Handlers (`/dre` recebe `mesInicio`/`mesFim`, até 36 meses) |
| `src/components/abas-modulo.tsx` | Abas do módulo Financeiro (Fluxo de Caixa e DFC) |

A tela busca 24 meses de DRE de uma vez (cerca de 150 linhas por mês) e calcula mês, comparação, acumulado e 12 meses no cliente. As consultas levam menos de 1 s.

Dados de homologação: agosto/2026 está incompleto e tem um lançamento de R$ 1,58 mi em "LIMPEZA E HIGIENE - LOJA" (P55).
