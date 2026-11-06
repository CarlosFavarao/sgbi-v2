// Tabelas do banco sgbi (MySQL 5.7), populadas pelo processo "headquarter".
// As `view_*` são tabelas materializadas pela carga noturna, não views SQL.
// Datas usam `mode: "string"` (YYYY-MM-DD): o servidor está em UTC e o mysql2
// deslocaria o `Date`.
import {
  date,
  double,
  index,
  int,
  mysqlTable,
  varchar,
} from "drizzle-orm/mysql-core";

export const filiais = mysqlTable("filiais", {
  codigo: int("codigo"),
  descricao: varchar("descricao", { length: 255 }),
});

export const analiseGerencial = mysqlTable(
  "view_analise_gerencial_produtos",
  {
    id: int("id").primaryKey().autoincrement(),
    filial: int("filial").notNull(),
    data: date("data", { mode: "string" }).notNull(),
    codigo: int("codigo").notNull(),
    descricao: varchar("descricao", { length: 255 }).notNull(),
    departamento: int("departamento").notNull(),
    grupo: int("grupo").notNull(),
    subgrupo: int("subgrupo").notNull(),
    // totalVenda = totalPDV + totalFaturamento (idem para custo)
    totalVenda: double("totalVenda"),
    totalPDV: double("totalPDV"),
    totalFaturamento: double("totalFaturamento"),
    totalCusto: double("totalCusto"),
    totalCustoPDV: double("totalCustoPDV"),
    totalCustoFaturamento: double("totalCustoFaturamento"),
    totalCompra: double("totalCompra"),
  },
  (table) => [index("idx_filial_data").on(table.filial, table.data)],
);

/** Consolidado diário de PDV por filial (ticket médio, cesta média). */
export const parfil = mysqlTable("parfil", {
  id: int("id").primaryKey().autoincrement(),
  filial: int("filial").notNull(),
  dataVenda: date("dataVenda", { mode: "string" }).notNull(),
  totvrvenda: double("totvrvenda").notNull(),
  totvrcusto: double("totvrcusto").notNull(),
  nclientes: int("nclientes").notNull(),
  sku: double("sku").notNull(),
});

export const cancelamentos = mysqlTable("cancelamentos", {
  id: int("id").primaryKey().autoincrement(),
  filial: int("filial").notNull(),
  codigoProduto: int("codigo_produto").notNull(),
  motivoCancelamento: varchar("motivo_cancelamento", { length: 255 }).notNull(),
  valorTotalCancelamento: double("valor_total_cancelamento").notNull(),
  quantidadeTotalCancelamento: double("quantidade_total_cancelamento").notNull(),
  codigoOperador: int("codigo_operador").notNull(),
  dataCancelamento: date("data_cancelamento", { mode: "string" }).notNull(),
});

export const despesa = mysqlTable("despesa", {
  id: int("id").primaryKey().autoincrement(),
  filial: int("filial").notNull(),
  tipoDespesa: int("tipo_despesa").notNull(),
  fornecedor: int("fornecedor").notNull(),
  descricao: varchar("descricao", { length: 255 }).notNull(),
  valor: double("valor").notNull(),
  dataDespesa: date("data_despesa", { mode: "string" }).notNull(),
});

/** Meta (previsão) de venda por filial e dia. */
export const previsaoDia = mysqlTable("previsao_dia", {
  id: int("id").primaryKey().autoincrement(),
  codigoFilial: int("codigo_filial"),
  ano: int("ano"),
  mes: int("mes"),
  codigoDia: int("codigo_dia"),
  previsaoVenda: double("previsao_venda"),
  previsaoLucro: double("previsao_lucro"),
  diasUteis: int("dias_uteis"),
});

/** Metas mensais por nível (sem meta diária: a distribuição nos dias usa a curva da `previsao_dia`). */
export const previsaoDepartamento = mysqlTable("previsao_departamento", {
  id: int("id").primaryKey().autoincrement(),
  codigoFilial: int("codigo_filial"),
  ano: int("ano"),
  mes: int("mes"),
  codigo: int("codigo_departamento"),
  previsaoVenda: double("previsao_venda"),
  previsaoLucro: double("previsao_lucro"),
});

export const previsaoGrupo = mysqlTable("previsao_grupo", {
  id: int("id").primaryKey().autoincrement(),
  codigoFilial: int("codigo_filial"),
  ano: int("ano"),
  mes: int("mes"),
  codigo: int("codigo_grupo"),
  previsaoVenda: double("previsao_venda"),
  previsaoLucro: double("previsao_lucro"),
});

export const previsaoSubgrupo = mysqlTable("previsao_subgrupo", {
  id: int("id").primaryKey().autoincrement(),
  codigoFilial: int("codigo_filial"),
  ano: int("ano"),
  mes: int("mes"),
  codigo: int("codigo_subgrupo"),
  previsaoVenda: double("previsao_venda"),
  previsaoLucro: double("previsao_lucro"),
});

export const departamentos = mysqlTable("view_11_departamentos", {
  id: int("id").primaryKey().autoincrement(),
  codigo: int("codigo").notNull(),
  descricao: varchar("descricao", { length: 255 }).notNull(),
});

export const grupos = mysqlTable("view_11_grupos", {
  id: int("id").primaryKey().autoincrement(),
  codigo: int("codigo").notNull(),
  descricao: varchar("descricao", { length: 255 }).notNull(),
  departamento: int("departamento").notNull(),
});

export const subgrupos = mysqlTable("view_11_subgrupos", {
  id: int("id").primaryKey().autoincrement(),
  codigo: int("codigo").notNull(),
  descricao: varchar("descricao", { length: 255 }).notNull(),
  grupo: int("grupo").notNull(),
});

/**
 * Item a item do PDV (milhões de linhas; sempre filtrar por filial e data).
 * Só as colunas usadas pelo v2. Um cupom = filial + dataVenda + numeroCaixa + numeroCupom.
 */
export const logpdv = mysqlTable(
  "logpdv",
  {
    id: int("id").primaryKey().autoincrement(),
    filial: int("filial"),
    dataVenda: date("dataVenda", { mode: "string" }),
    codigo: int("codigo"),
    departamento: int("departamento"),
    grupo: int("grupo"),
    subgrupo: int("subgrupo"),
    numeroCaixa: int("numeroCaixa"),
    numeroCupom: int("numeroCupom"),
    valorTotal: double("valorTotal"),
    quantidadeVendida: double("quantidadeVendida"),
  },
  (table) => [index("idx_logpdv_filial_data").on(table.filial, table.dataVenda)],
);

/** Títulos a pagar (só as colunas usadas). Datas vazias vêm como 0000-00-00. */
export const contasPagar = mysqlTable("contas_pagar", {
  id: int("id").primaryKey().autoincrement(),
  codigoFilial: int("codigo_filial"),
  codigoFornecedor: int("codigo_fornecedor"),
  nome: varchar("nome", { length: 40 }),
  observacao: varchar("observacao", { length: 100 }),
  dataEmissao: date("data_emissao", { mode: "string" }),
  dataVencimento: date("data_vencimento", { mode: "string" }),
  dataPagamento: date("data_pagamento", { mode: "string" }),
  valorPagar: double("valor_pagar"),
  taxaBoleto: double("taxa_boleto"),
  valorTotalPagamento: double("valor_total_pagamento"),
  /** "D" = despesa (como no relatório Análise de Contas do BI antigo). */
  classificacaoProduto: varchar("classificacao_produto", { length: 1 }),
});

/** Títulos a receber (crediário, boletos...). */
export const contasReceber = mysqlTable("contas_receber", {
  id: int("id").primaryKey().autoincrement(),
  codigoFilial: int("codigo_filial"),
  nomeCliente: varchar("nome_cliente", { length: 20 }),
  dataEmissao: date("data_emissao", { mode: "string" }),
  dataVencimento: date("data_vencimento", { mode: "string" }),
  dataRecebimento: date("data_recebimento", { mode: "string" }),
  valorDocumento: double("valor_documento"),
  valorRecebido: double("valor_recebido"),
});

/** Vendas em cartão com data de liquidação (vencimento) por parcela. */
export const cartoesVendas = mysqlTable("cartoes_vendas", {
  codigoFilial: int("codigo_filial"),
  numeroParcela: int("numero_parcela"),
  valorBruto: double("valor_bruto"),
  valorLiquido: double("valor_liquido"),
  dataVenda: date("data_venda", { mode: "string" }),
  dataVencimento: date("data_vencimento", { mode: "string" }),
  codigoEmpresa: int("codigo_empresa"),
});

export const cartoesEmpresas = mysqlTable("cartoes_empresas", {
  codigoEmpresa: int("codigo_empresa"),
  descricaoEmpresa: varchar("descricao_empresa", { length: 255 }),
});

export const fornecedores = mysqlTable("fornecedores", {
  codigo: int("codigo"),
  razaoSocial: varchar("razaoSocial", { length: 255 }),
  nomeFantasia: varchar("nomeFantasia", { length: 255 }),
});

/**
 * DRE gerencial mensal por filial, montada pelo VX. `id_geral` é hierárquico:
 * 2 dígitos = linha principal (01 Receita Bruta... 08 Despesas), 5 = grupo,
 * 8 = subgrupo de despesa, 13 = item. `periodo` = 1º dia do mês.
 */
export const viewDre = mysqlTable("view_dre", {
  id: int("id").primaryKey().autoincrement(),
  periodo: date("periodo", { mode: "string" }),
  filial: int("filial"),
  idGeral: varchar("id_geral", { length: 13 }),
  idPrincipal: varchar("id_principal", { length: 255 }),
  valor: double("valor"),
  descricao: varchar("descricao", { length: 255 }),
});

/**
 * Token da API do VX (`API_VIEW`), cadastrado na instalação do BI antigo. Vazio
 * em homologação. Só o servidor lê (`src/server/vx.ts`); nunca vai para o cliente.
 */
export const tokens = mysqlTable("tokens", {
  id: int("id").primaryKey().autoincrement(),
  token: varchar("token", { length: 255 }).notNull(),
  endpoint: varchar("endpoint", { length: 255 }),
});
