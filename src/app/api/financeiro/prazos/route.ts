import type { NextRequest } from "next/server";
import { getPrazos } from "@/features/financeiro/server/data";
import { handle, parseFiliais, parsePeriodo } from "@/server/params";
import { exigirAcesso } from "@/server/acesso";

export async function GET(request: NextRequest) {
  return handle(async () => {
    await exigirAcesso("financeiro", ["contas-pagar", "contas-receber", "cartoes"]);
    const params = request.nextUrl.searchParams;
    return getPrazos(parsePeriodo(params), parseFiliais(params));
  }, "financeiro");
}
