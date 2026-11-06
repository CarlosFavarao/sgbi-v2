import type { NextRequest } from "next/server";
import { getTotal } from "@/features/metas/server/data";
import { parseDepartamento } from "@/features/metas/server/params";
import { handle, parseFiliais, parseOrigem, parsePeriodo } from "@/server/params";
import { exigirAcesso } from "@/server/acesso";

export async function GET(request: NextRequest) {
  return handle(async () => {
    await exigirAcesso("metas", ["metas", "venda"]);
    const params = request.nextUrl.searchParams;
    return getTotal(parsePeriodo(params), parseFiliais(params), parseOrigem(params), parseDepartamento(params));
  }, "metas");
}
