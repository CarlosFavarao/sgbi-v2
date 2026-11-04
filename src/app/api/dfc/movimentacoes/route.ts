import type { NextRequest } from "next/server";
import { DFC_CONFIG } from "@/features/dfc/config";
import { getMovimentacoes } from "@/features/dfc/server/data";
import type { MovimentacoesResponse } from "@/features/dfc/types";
import { handle, parseFiliais, parsePeriodo } from "@/server/params";

export async function GET(request: NextRequest) {
  return handle(async (): Promise<MovimentacoesResponse> => {
    const params = request.nextUrl.searchParams;
    const movimentacoes = await getMovimentacoes(parsePeriodo(params), parseFiliais(params), DFC_CONFIG.movimentacoes);
    return { movimentacoes };
  }, "dfc");
}
