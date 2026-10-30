import type { NextRequest } from "next/server";
import { periodoComparacao } from "@/features/painel-executivo/date";
import { getSerie } from "@/features/painel-executivo/server/data";
import {
  handle,
  parseComparacao,
  parseFiliais,
  parseFonte,
  parseOrigem,
  parsePeriodo,
} from "@/features/painel-executivo/server/params";
import type { SerieResponse } from "@/features/painel-executivo/types";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/painel-executivo/series/[fonte]">) {
  return handle(async (): Promise<SerieResponse> => {
    const fonte = parseFonte((await ctx.params).fonte);
    const params = request.nextUrl.searchParams;
    const periodo = parsePeriodo(params);
    const anterior = periodoComparacao(periodo, parseComparacao(params));
    const filiais = parseFiliais(params);
    // Só a venda (analise gerencial) separa PDV e faturamento.
    const origem = fonte === "vendas" ? parseOrigem(params) : "todos";

    const [atual, comparacao] = await Promise.all([
      getSerie(fonte, periodo, filiais, origem),
      getSerie(fonte, anterior, filiais, origem),
    ]);
    return { atual, anterior: comparacao };
  });
}
