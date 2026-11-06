import type { NextRequest } from "next/server";
import { getNiveisMetas } from "@/features/metas/server/data";
import { parseDepartamento, parsePeriodoOpcional } from "@/features/metas/server/params";
import { handle, parseFiliais, parseNivel, parseOrigem, parsePeriodo } from "@/server/params";
import { exigirAcesso } from "@/server/acesso";

export async function GET(request: NextRequest) {
  return handle(async () => {
    await exigirAcesso("metas", ["metas", "venda"]);
    const params = request.nextUrl.searchParams;
    return getNiveisMetas(
      parseNivel(params),
      parsePeriodo(params),
      parsePeriodoOpcional(params, "decorrido"),
      parsePeriodoOpcional(params, "comparacao"),
      parseFiliais(params),
      parseOrigem(params),
      parseDepartamento(params),
    );
  }, "metas");
}
