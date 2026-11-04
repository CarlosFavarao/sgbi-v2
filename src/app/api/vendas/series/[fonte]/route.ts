import type { NextRequest } from "next/server";
import { getSerie } from "@/features/vendas/server/data";
import { parseFonteVendas } from "@/features/vendas/server/params";
import type { SerieVendasResponse } from "@/features/vendas/types";
import { handle, parseFiliais, parseOrigem, parsePeriodo, parsePeriodoComparacao } from "@/server/params";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/vendas/series/[fonte]">) {
  return handle(async (): Promise<SerieVendasResponse> => {
    const fonte = parseFonteVendas((await ctx.params).fonte);
    const params = request.nextUrl.searchParams;
    const filiais = parseFiliais(params);
    // Os cupons vêm do PDV: a origem só vale para a venda.
    const origem = fonte === "vendas" ? parseOrigem(params) : "todos";

    const [atual, anterior] = await Promise.all([
      getSerie(fonte, parsePeriodo(params), filiais, origem),
      getSerie(fonte, parsePeriodoComparacao(params), filiais, origem),
    ]);
    return { atual, anterior };
  }, "vendas");
}
