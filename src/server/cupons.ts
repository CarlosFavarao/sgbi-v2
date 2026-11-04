import "server-only";

import { and, between, inArray, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { logpdv } from "@/db/schema";
import type { Periodo } from "@/lib/filtros";
import { CACHE_TAG_SGBI } from "./filiais";

export type CuponsDia = {
  data: string;
  /** Venda do PDV no `logpdv` (bate com a venda PDV da analise gerencial). */
  vendaPdv: number;
  cupons: number;
  /** Quantidade vendida (unidades e kg, como a "cesta média" do BI antigo). */
  itens: number;
};

/**
 * Venda, cupons e itens do PDV por dia, do `logpdv` (base do Ticket Médio do
 * Painel Executivo e da tela de Vendas). Um cupom = filial + dia + caixa + número.
 * Consulta lenta (milhões de linhas, P23): deixe em rota separada.
 */
export async function getCuponsDiarios(periodo: Periodo, lojas: number[]): Promise<CuponsDia[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAG_SGBI);

  // Agrupa primeiro por cupom e depois por dia: bem mais rápido que count(distinct ...).
  const porCupom = db
    .select({
      data: logpdv.dataVenda,
      valor: sql<number>`sum(${logpdv.valorTotal})`.as("valor"),
      itens: sql<number>`sum(${logpdv.quantidadeVendida})`.as("itens"),
    })
    .from(logpdv)
    .where(and(inArray(logpdv.filial, lojas), between(logpdv.dataVenda, periodo.inicio, periodo.fim)))
    .groupBy(logpdv.filial, logpdv.dataVenda, logpdv.numeroCaixa, logpdv.numeroCupom)
    .as("por_cupom");

  const linhas = await db
    .select({
      data: porCupom.data,
      vendaPdv: sql<number>`coalesce(sum(${porCupom.valor}), 0)`.mapWith(Number),
      cupons: sql<number>`count(*)`.mapWith(Number),
      itens: sql<number>`coalesce(sum(${porCupom.itens}), 0)`.mapWith(Number),
    })
    .from(porCupom)
    .groupBy(porCupom.data);
  return linhas.map((l) => ({ ...l, data: l.data! }));
}
