import "server-only";

import { eq, ne, sql, type SQL } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { analiseGerencial, filiais } from "@/db/schema";
import type { FiliaisResponse } from "@/lib/filtros";

/** Tag de cache dos dados comuns a todas as telas (D-1, carga noturna). */
export const CACHE_TAG_SGBI = "sgbi";

const isoDate = (expression: SQL) => sql<string>`date_format(${expression}, '%Y-%m-%d')`;

/** Filiais com movimento na analise gerencial e o intervalo de datas carregado. */
export async function getFiliais(): Promise<FiliaisResponse> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAG_SGBI);

  const comMovimento = db
    .selectDistinct({ filial: analiseGerencial.filial })
    .from(analiseGerencial)
    .as("com_movimento");

  const [lista, [limites], [ultimaVenda]] = await Promise.all([
    db
      .select({
        codigo: comMovimento.filial,
        descricao: sql<string>`coalesce(trim(${filiais.descricao}), concat('Filial ', ${comMovimento.filial}))`,
      })
      .from(comMovimento)
      .leftJoin(filiais, eq(filiais.codigo, comMovimento.filial))
      .orderBy(comMovimento.filial),
    db
      .select({
        dataMinima: isoDate(sql`min(${analiseGerencial.data})`),
        dataMaxima: isoDate(sql`max(${analiseGerencial.data})`),
      })
      .from(analiseGerencial),
    // A carga do último dia pode vir parcial (ex.: só compras, venda zerada):
    // o "dados até" das telas é o último dia com venda.
    db
      .select({ data: isoDate(sql`max(${analiseGerencial.data})`) })
      .from(analiseGerencial)
      .where(ne(analiseGerencial.totalVenda, 0)),
  ]);

  return {
    filiais: lista,
    dataMinima: limites?.dataMinima ?? null,
    dataMaxima: ultimaVenda?.data ?? limites?.dataMaxima ?? null,
  };
}
