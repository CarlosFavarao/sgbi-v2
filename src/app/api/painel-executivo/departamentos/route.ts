import type { NextRequest } from "next/server";
import { getDepartamentos } from "@/features/painel-executivo/server/data";
import {
  handle,
  parseFiliais,
  parseNivel,
  parseOrigem,
  parsePeriodo,
  parsePeriodoComparacao,
} from "@/features/painel-executivo/server/params";

export async function GET(request: NextRequest) {
  return handle(() => {
    const params = request.nextUrl.searchParams;
    const periodo = parsePeriodo(params);
    return getDepartamentos(
      parseNivel(params),
      periodo,
      parsePeriodoComparacao(params),
      parseFiliais(params),
      parseOrigem(params),
    );
  });
}
