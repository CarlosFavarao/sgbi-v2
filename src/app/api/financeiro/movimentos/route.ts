import type { NextRequest } from "next/server";
import { getMovimentos } from "@/features/financeiro/server/data";
import { parseReferencia } from "@/features/financeiro/server/params";
import type { MovimentosResponse } from "@/features/financeiro/types";
import { handle, parseFiliais, parsePeriodo } from "@/server/params";
import { exigirAcesso } from "@/server/acesso";

export async function GET(request: NextRequest) {
  return handle(async (): Promise<MovimentosResponse> => {
    await exigirAcesso("financeiro", ["contas-pagar", "contas-receber", "cartoes"]);
    const params = request.nextUrl.searchParams;
    return { movimentos: await getMovimentos(parsePeriodo(params), parseReferencia(params), parseFiliais(params)) };
  }, "financeiro");
}
