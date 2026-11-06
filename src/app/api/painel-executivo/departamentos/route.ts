import type { NextRequest } from "next/server";
import { getDepartamentos } from "@/features/painel-executivo/server/data";
import {
  handle,
  parseFiliais,
  parseNivel,
  parseOrigem,
  parsePeriodo,
  parsePeriodoComparacao,
} from "@/server/params";
import { exigirAcesso } from "@/server/acesso";

export async function GET(request: NextRequest) {
  return handle(async () => {
    await exigirAcesso("painel-executivo", ["venda", "compra"]);
    const params = request.nextUrl.searchParams;
    const periodo = parsePeriodo(params);
    return getDepartamentos(
      parseNivel(params),
      periodo,
      parsePeriodoComparacao(params),
      parseFiliais(params),
      parseOrigem(params),
    );
  }, "painel-executivo");
}
