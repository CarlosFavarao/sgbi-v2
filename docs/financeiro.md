# Financeiro · Fluxo de Caixa

Quarta tela do v2 (`/financeiro`), feita a partir de um print de referência que define **quais dados** a tela mostra. O visual segue o padrão das outras telas. Decisões em [`decisoes-e-pendencias.md`](decisoes-e-pendencias.md) (D32 a D36) e perguntas em aberto em P42 a P50.

## 1. Fontes de dados

| Tabela | Uso | Cobertura em homologação |
|---|---|---|
| `cartoes_vendas` (+ `cartoes_empresas`) | Entradas: valor líquido de cada parcela no vencimento (liquidação), por empresa de cartão | Vendas de 13/08 a 02/10/2026; vencimentos até dez/2026; cerca de 69 mil parcelas |
| `contas_receber` | Entradas: recebidas (data e valor recebido) ou em aberto (vencimento e valor do documento) | 47 títulos, R$ 31,9 mil, vencimentos de 13/08 a 20/09/2026 |
| `contas_pagar` (+ `fornecedores`) | Saídas: pagas (data e valor pago) ou em aberto (vencimento, valor + taxa do boleto) | 33 títulos, R$ 50,6 mil, vencimentos de 13/08 a 20/09/2026 |

**O que o banco não tem** (blocos do print sem fonte):

- Saldos e contas bancárias: saldo em caixa, saldo por conta, dias de cobertura, caixa líquido (P42).
- Vendas à vista por finalizadora (dinheiro, Pix): só na API do VX (P44).
- Plano de contas dos pagamentos (Pessoal, Tributos...): só a classificação "D" = despesa (P45).
- Estoque valorizado (prazo médio de estoque, ciclo de caixa, capital de giro) (P48).

Esses blocos aparecem como "não integrado", e o popup de avisos da barra lateral resume o que falta.

## 2. Regras

- **Referência ("hoje")**: último dia com venda do mês escolhido (igual a Metas, D26).
- **Situação de cada movimento** (D33): realizado (recebido/pago até a referência, ou cartão vencido até ela), previsto (em aberto, vence depois) ou vencido (em aberto, venceu até a referência).
- **Entradas, saídas e resultado do período**: realizados do dia 1 do mês até a referência, contra o mesmo intervalo do mês anterior.
- **Evolução do caixa**: barras de entradas (para cima) e saídas (para baixo) por dia, claras quando previstas; o resultado acumulado do mês (eixo da direita) é realizado até a referência e projetado depois. Parte de zero, sem saldo inicial.
- **Fluxo previsto (30 dias)**: só previstos (cartões a liquidar e títulos em aberto). Status: dia negativo = Atenção, acumulado negativo = Crítico (P46). "Menor saldo projetado" = menor acumulado.
- **Compromissos a vencer**: títulos vencidos em aberto (até 60 dias antes) e a vencer nos próximos 30 dias; cartões agrupados por dia e empresa.
- **Prazos médios** (últimos 90 dias, ponderados pelo valor): cartões venda → vencimento; clientes e fornecedores emissão → vencimento.

## 3. Implementação

Estrutura em `src/features/financeiro/`:

| Arquivo | Papel |
|---|---|
| `server/data.ts` | Queries Drizzle (server-only) com `'use cache'` e tag `financeiro`: movimentos, compromissos e prazos |
| `compute.ts` | Realizado no período, vencidos, evolução do mês, fluxo previsto, categorias e meses |
| `config.ts` | Dias do previsto, janela dos prazos, categorias no gráfico, linhas dos compromissos |
| `src/app/api/financeiro/{movimentos,compromissos,prazos}` | Route Handlers |
| `components/` | KPIs, evolução do caixa, categorias, fluxo previsto, compromissos, saldo por conta, 12 meses e indicadores |

Detalhes técnicos:

- `cartoes_empresas` é `latin1`: textos com acento não podem ir como literal no SQL junto com colunas dela ("Illegal mix of collations"); o nome padrão do cartão é montado no código.
- As datas vazias do VX chegam como `0000-00-00` e são tratadas como vazias.
- Consultas rápidas (tabelas pequenas; cartões agrupados por dia e empresa): menos de 1 s.

## Layout personalizável (D43)

A tela usa a grade personalizável, como o Painel Executivo (ver `docs/painel-executivo-poc.md`, seção 9): o lápis ao lado dos filtros liga a edição (arrastar, trocar de lugar, redimensionar pelas bordas e cantos, ocultar, restaurar o padrão). O layout padrão e os limites de cada card ficam em `src/features/financeiro/layout.ts` (Fluxo de Caixa) e `src/features/financeiro/layout-dfc.ts` (DFC).
