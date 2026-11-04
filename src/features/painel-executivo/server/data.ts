import "server-only";

import { and, between, eq, inArray, sql, type AnyColumn, type SQL } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import {
  analiseGerencial,
  cancelamentos,
  departamentos,
  despesa,
  grupos,
  parfil,
  previsaoDia,
  subgrupos,
} from "@/db/schema";
import { daysInMonth, firstDayOfMonth } from "@/lib/date";
import type {
  DepartamentosResponse,
  Fonte,
  LinhaNivel,
  MetaResponse,
  Nivel,
  Origem,
  Periodo,
  PontoSerie,
} from "../types";

// Dados D-1 (carga noturna): cache de horas, invalidável pela tag.
const CACHE_TAG = "painel-executivo";

function vendaPorOrigem(origem: Origem) {
  if (origem === "pdv") return analiseGerencial.totalPDV;
  if (origem === "faturamento") return analiseGerencial.totalFaturamento;
  return analiseGerencial.totalVenda;
}

function custoPorOrigem(origem: Origem) {
  if (origem === "pdv") return analiseGerencial.totalCustoPDV;
  if (origem === "faturamento") return analiseGerencial.totalCustoFaturamento;
  return analiseGerencial.totalCusto;
}

const sum = (column: AnyColumn | SQL) =>
  sql<number>`coalesce(sum(${column}), 0)`.mapWith(Number);

/**
 * Série diária de uma fonte (só os dias com carga). Cada fonte é consultada
 * separadamente para que cada card apareça assim que os seus dados chegam.
 * `origem` só afeta a fonte "vendas".
 */
export async function getSerie(
  fonte: Fonte,
  periodo: Periodo,
  lojas: number[],
  origem: Origem,
): Promise<PontoSerie[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAG);

  const { inicio, fim } = periodo;

  switch (fonte) {
    case "vendas":
      return db
        .select({
          data: analiseGerencial.data,
          venda: sum(vendaPorOrigem(origem)),
          custo: sum(custoPorOrigem(origem)),
          compra: sum(analiseGerencial.totalCompra),
        })
        .from(analiseGerencial)
        .where(and(inArray(analiseGerencial.filial, lojas), between(analiseGerencial.data, inicio, fim)))
        .groupBy(analiseGerencial.data);
    case "pdv":
      return db
        .select({
          data: parfil.dataVenda,
          vendaPdv: sum(parfil.totvrvenda),
          tickets: sum(parfil.nclientes),
        })
        .from(parfil)
        .where(and(inArray(parfil.filial, lojas), between(parfil.dataVenda, inicio, fim)))
        .groupBy(parfil.dataVenda);
    case "cancelamentos":
      return db
        .select({
          data: cancelamentos.dataCancelamento,
          cancelamentos: sum(cancelamentos.valorTotalCancelamento),
        })
        .from(cancelamentos)
        .where(
          and(inArray(cancelamentos.filial, lojas), between(cancelamentos.dataCancelamento, inicio, fim)),
        )
        .groupBy(cancelamentos.dataCancelamento);
    case "despesas":
      return db
        .select({ data: despesa.dataDespesa, despesas: sum(despesa.valor) })
        .from(despesa)
        .where(and(inArray(despesa.filial, lojas), between(despesa.dataDespesa, inicio, fim)))
        .groupBy(despesa.dataDespesa);
  }
}

const dataPrevisao = sql`str_to_date(concat(${previsaoDia.ano}, '-', ${previsaoDia.mes}, '-', ${previsaoDia.codigoDia}), '%Y-%m-%d')`;

export async function getMeta(
  periodo: Periodo,
  lojas: number[],
  origem: Origem,
): Promise<MetaResponse> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAG);

  const mes = periodo.fim.slice(0, 7);
  const [ano, mesNumero] = mes.split("-").map(Number);
  const lojasMeta = inArray(previsaoDia.codigoFilial, lojas);

  const [[metaPeriodo], [metaMes], [realizado]] = await Promise.all([
    db
      .select({ valor: sum(previsaoDia.previsaoVenda) })
      .from(previsaoDia)
      .where(and(lojasMeta, between(dataPrevisao, periodo.inicio, periodo.fim))),
    db
      .select({ valor: sum(previsaoDia.previsaoVenda) })
      .from(previsaoDia)
      .where(and(lojasMeta, eq(previsaoDia.ano, ano), eq(previsaoDia.mes, mesNumero))),
    db
      .select({ valor: sum(vendaPorOrigem(origem)) })
      .from(analiseGerencial)
      .where(
        and(
          inArray(analiseGerencial.filial, lojas),
          between(analiseGerencial.data, firstDayOfMonth(periodo.fim), periodo.fim),
        ),
      ),
  ]);

  return {
    metaPeriodo: metaPeriodo?.valor ?? 0,
    mes,
    metaMes: metaMes?.valor ?? 0,
    realizadoMes: realizado?.valor ?? 0,
    diasRestantes: daysInMonth(periodo.fim) - Number(periodo.fim.slice(8, 10)),
  };
}

const niveis = {
  departamento: { coluna: analiseGerencial.departamento, tabela: departamentos },
  grupo: { coluna: analiseGerencial.grupo, tabela: grupos },
  subgrupo: { coluna: analiseGerencial.subgrupo, tabela: subgrupos },
} as const;

async function compraVendaPorNivel(
  nivel: Nivel,
  periodo: Periodo,
  lojas: number[],
  origem: Origem,
) {
  const { coluna } = niveis[nivel];
  const filtros: SQL[] = [
    inArray(analiseGerencial.filial, lojas),
    between(analiseGerencial.data, periodo.inicio, periodo.fim),
  ];

  return db
    .select({
      codigo: coluna,
      compra: sum(analiseGerencial.totalCompra),
      venda: sum(vendaPorOrigem(origem)),
    })
    .from(analiseGerencial)
    .where(and(...filtros))
    .groupBy(coluna);
}

export async function getDepartamentos(
  nivel: Nivel,
  periodo: Periodo,
  periodoAnterior: Periodo,
  lojas: number[],
  origem: Origem,
): Promise<DepartamentosResponse> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAG);

  const { tabela } = niveis[nivel];
  const [atual, anterior, descricoes] = await Promise.all([
    compraVendaPorNivel(nivel, periodo, lojas, origem),
    compraVendaPorNivel(nivel, periodoAnterior, lojas, origem),
    db
      .select({ codigo: tabela.codigo, descricao: sql<string>`trim(${tabela.descricao})` })
      .from(tabela),
  ]);

  const descricaoPorCodigo = new Map(descricoes.map((d) => [d.codigo, d.descricao]));
  const anteriorPorCodigo = new Map(anterior.map((a) => [a.codigo, a]));
  const codigos = new Set([...atual.map((a) => a.codigo), ...anterior.map((a) => a.codigo)]);
  const atualPorCodigo = new Map(atual.map((a) => [a.codigo, a]));

  const linhas: LinhaNivel[] = [...codigos]
    .map((codigo) => ({
      codigo,
      descricao: descricaoPorCodigo.get(codigo) ?? `Código ${codigo}`,
      compra: atualPorCodigo.get(codigo)?.compra ?? 0,
      venda: atualPorCodigo.get(codigo)?.venda ?? 0,
      compraAnterior: anteriorPorCodigo.get(codigo)?.compra ?? 0,
      vendaAnterior: anteriorPorCodigo.get(codigo)?.venda ?? 0,
    }))
    .filter((l) => l.compra || l.venda || l.compraAnterior || l.vendaAnterior)
    .sort((a, b) => b.venda - a.venda);

  return { linhas };
}
