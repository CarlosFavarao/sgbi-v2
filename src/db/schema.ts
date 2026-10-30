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
