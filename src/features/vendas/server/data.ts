import "server-only";

import { and, between, inArray, sql, type AnyColumn, type SQL } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { analiseGerencial, departamentos, grupos, logpdv, subgrupos } from "@/db/schema";
import type { Origem } from "@/lib/filtros";
import { getCuponsDiarios } from "@/server/cupons";
import { montarProdutos } from "../abc";
import type {
  CuponsNivelResponse,
  FonteVendas,
  LinhaVendaNivel,
  Nivel,
  NiveisResponse,
  Periodo,
  PontoVendas,
  ProdutosResponse,
} from "../types";

// Dados D-1 (carga noturna): cache de horas, invalidável pela tag.
const CACHE_TAG = "vendas";

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

const sum = (column: AnyColumn | SQL | SQL.Aliased) => sql<number>`coalesce(sum(${column}), 0)`.mapWith(Number);
const count = () => sql<number>`count(*)`.mapWith(Number);

const filtroAnalise = (periodo: Periodo, lojas: number[]) =>
  and(inArray(analiseGerencial.filial, lojas), between(analiseGerencial.data, periodo.inicio, periodo.fim));

// Sempre pelo índice (filial, dataVenda): o logpdv tem milhões de linhas.
const filtroLogpdv = (periodo: Periodo, lojas: number[]) =>
  and(inArray(logpdv.filial, lojas), between(logpdv.dataVenda, periodo.inicio, periodo.fim));

/** Colunas de um cupom no logpdv (o número do cupom só é único por filial, dia e caixa). */
const chaveCupom = [logpdv.filial, logpdv.dataVenda, logpdv.numeroCaixa, logpdv.numeroCupom] as const;

/**
 * Série diária de uma fonte (só os dias com carga). `origem` só afeta "vendas":
 * os cupons vêm do PDV.
 */
export async function getSerie(
  fonte: FonteVendas,
  periodo: Periodo,
  lojas: number[],
  origem: Origem,
): Promise<PontoVendas[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAG);

  if (fonte === "vendas") {
    return db
      .select({
        data: analiseGerencial.data,
        venda: sum(vendaPorOrigem(origem)),
        custo: sum(custoPorOrigem(origem)),
      })
      .from(analiseGerencial)
      .where(filtroAnalise(periodo, lojas))
      .groupBy(analiseGerencial.data);
  }

  return getCuponsDiarios(periodo, lojas);
}

const niveis = {
  departamento: { coluna: analiseGerencial.departamento, pai: null, colunaPdv: logpdv.departamento },
  grupo: { coluna: analiseGerencial.grupo, pai: analiseGerencial.departamento, colunaPdv: logpdv.grupo },
  subgrupo: { coluna: analiseGerencial.subgrupo, pai: analiseGerencial.grupo, colunaPdv: logpdv.subgrupo },
} as const;

async function descricoes(nivel: Nivel) {
  const tabela = { departamento: departamentos, grupo: grupos, subgrupo: subgrupos }[nivel];
  const linhas = await db
    .select({ codigo: tabela.codigo, descricao: sql<string>`trim(${tabela.descricao})` })
    .from(tabela);
  return new Map(linhas.map((l) => [l.codigo, l.descricao]));
}

async function vendaPorNivel(nivel: Nivel, periodo: Periodo, lojas: number[], origem: Origem) {
  const { coluna, pai } = niveis[nivel];
  return db
    .select({
      codigo: coluna,
      // Códigos são únicos em toda a hierarquia: o pai é o mesmo em todas as linhas.
      pai: pai ? sql<number>`max(${pai})`.mapWith(Number) : sql<null>`null`,
      venda: sum(vendaPorOrigem(origem)),
      custo: sum(custoPorOrigem(origem)),
    })
    .from(analiseGerencial)
    .where(filtroAnalise(periodo, lojas))
    .groupBy(coluna);
}

/** Venda e custo por departamento, grupo ou subgrupo, nos dois períodos. */
export async function getNiveis(
  nivel: Nivel,
  periodo: Periodo,
  anterior: Periodo,
  lojas: number[],
  origem: Origem,
): Promise<NiveisResponse> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAG);

  const [atual, comparacao, nomes] = await Promise.all([
    vendaPorNivel(nivel, periodo, lojas, origem),
    vendaPorNivel(nivel, anterior, lojas, origem),
    descricoes(nivel),
  ]);

  const linhas = new Map<number, LinhaVendaNivel>();
  const linha = (codigo: number, pai: number | null) => {
    let l = linhas.get(codigo);
    if (!l) {
      l = {
        codigo,
        descricao: nomes.get(codigo) ?? `Código ${codigo}`,
        pai,
        venda: 0,
        custo: 0,
        vendaAnterior: 0,
        custoAnterior: 0,
      };
      linhas.set(codigo, l);
    }
    return l;
  };
  for (const a of atual) Object.assign(linha(a.codigo, a.pai), { venda: a.venda, custo: a.custo });
  for (const b of comparacao) Object.assign(linha(b.codigo, b.pai), { vendaAnterior: b.venda, custoAnterior: b.custo });

  return {
    nivel,
    linhas: [...linhas.values()]
      .filter((l) => l.venda || l.vendaAnterior)
      .sort((a, b) => b.venda - a.venda),
  };
}

async function cuponsPorNivel(nivel: Nivel, periodo: Periodo, lojas: number[]) {
  const { colunaPdv } = niveis[nivel];
  const porCupom = db
    .select({ codigo: colunaPdv, itens: sql<number>`sum(${logpdv.quantidadeVendida})`.as("itens") })
    .from(logpdv)
    .where(filtroLogpdv(periodo, lojas))
    .groupBy(colunaPdv, ...chaveCupom)
    .as("por_cupom");

  return db
    .select({ codigo: porCupom.codigo, cupons: count(), itens: sum(porCupom.itens) })
    .from(porCupom)
    .groupBy(porCupom.codigo);
}

/** Cupons e itens por nível (PDV, logpdv). Consulta lenta: rota separada da venda. */
export async function getCuponsNiveis(
  nivel: Nivel,
  periodo: Periodo,
  anterior: Periodo,
  lojas: number[],
): Promise<CuponsNivelResponse> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAG);

  const [atual, comparacao] = await Promise.all([
    cuponsPorNivel(nivel, periodo, lojas),
    cuponsPorNivel(nivel, anterior, lojas),
  ]);
  const anteriorPorCodigo = new Map(comparacao.map((c) => [c.codigo, c]));
  const codigos = new Set([...atual, ...comparacao].map((c) => c.codigo).filter((c) => c != null));
  const atualPorCodigo = new Map(atual.map((a) => [a.codigo, a]));

  return {
    nivel,
    linhas: [...codigos].map((codigo) => ({
      codigo: codigo!,
      cupons: atualPorCodigo.get(codigo)?.cupons ?? 0,
      itens: atualPorCodigo.get(codigo)?.itens ?? 0,
      cuponsAnterior: anteriorPorCodigo.get(codigo)?.cupons ?? 0,
      itensAnterior: anteriorPorCodigo.get(codigo)?.itens ?? 0,
    })),
  };
}

function vendaPorProduto(periodo: Periodo, lojas: number[], origem: Origem) {
  return db
    .select({
      codigo: analiseGerencial.codigo,
      descricao: sql<string>`trim(max(${analiseGerencial.descricao}))`,
      departamento: sql<number>`max(${analiseGerencial.departamento})`.mapWith(Number),
      venda: sum(vendaPorOrigem(origem)),
      custo: sum(custoPorOrigem(origem)),
    })
    .from(analiseGerencial)
    .where(filtroAnalise(periodo, lojas))
    .groupBy(analiseGerencial.codigo);
}

/**
 * Curva ABC (por faturamento e por rentabilidade) e listas de produtos.
 * Calculada no servidor: o período tem milhares de produtos.
 */
export async function getProdutos(
  periodo: Periodo,
  anterior: Periodo,
  lojas: number[],
  origem: Origem,
): Promise<ProdutosResponse> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAG);

  const [atual, comparacao, nomes] = await Promise.all([
    vendaPorProduto(periodo, lojas, origem),
    vendaPorProduto(anterior, lojas, origem),
    descricoes("departamento"),
  ]);

  return montarProdutos(
    atual.map((p) => ({ ...p, departamento: nomes.get(p.departamento) ?? `Código ${p.departamento}` })),
    new Map(comparacao.map((p) => [p.codigo, p.venda])),
  );
}
