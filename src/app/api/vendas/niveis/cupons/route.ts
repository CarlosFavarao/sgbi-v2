import type { NextRequest } from "next/server";
import { getCuponsNiveis } from "@/features/vendas/server/data";
import { handle, parseFiliais, parseNivel, parsePeriodo, parsePeriodoComparacao } from "@/server/params";

/** Separada de /niveis: a contagem de cupons no logpdv é lenta e carrega depois. */
export async function GET(request: NextRequest) {
  return handle(() => {
    const params = request.nextUrl.searchParams;
    return getCuponsNiveis(
      parseNivel(params),
      parsePeriodo(params),
      parsePeriodoComparacao(params),
      parseFiliais(params),
    );
  }, "vendas");
}
