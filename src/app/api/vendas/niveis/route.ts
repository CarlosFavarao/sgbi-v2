import type { NextRequest } from "next/server";
import { getNiveis } from "@/features/vendas/server/data";
import { handle, parseFiliais, parseNivel, parseOrigem, parsePeriodo, parsePeriodoComparacao } from "@/server/params";
import { exigirAcesso } from "@/server/acesso";

export async function GET(request: NextRequest) {
  return handle(async () => {
    await exigirAcesso("vendas", ["venda"]);
    const params = request.nextUrl.searchParams;
    return getNiveis(
      parseNivel(params),
      parsePeriodo(params),
      parsePeriodoComparacao(params),
      parseFiliais(params),
      parseOrigem(params),
    );
  }, "vendas");
}
