import type { NextRequest } from "next/server";
import { getProdutos } from "@/features/vendas/server/data";
import { handle, parseFiliais, parseOrigem, parsePeriodo, parsePeriodoComparacao } from "@/server/params";
import { exigirAcesso } from "@/server/acesso";

export async function GET(request: NextRequest) {
  return handle(async () => {
    await exigirAcesso("vendas", ["venda"]);
    const params = request.nextUrl.searchParams;
    return getProdutos(
      parsePeriodo(params),
      parsePeriodoComparacao(params),
      parseFiliais(params),
      parseOrigem(params),
    );
  }, "vendas");
}
