import type { NextRequest } from "next/server";
import { periodoComparacao } from "@/features/painel-executivo/date";
import { getDepartamentos } from "@/features/painel-executivo/server/data";
import {
  handle,
  parseComparacao,
  parseFiliais,
  parseNivel,
  parseOrigem,
  parsePeriodo,
} from "@/features/painel-executivo/server/params";

export async function GET(request: NextRequest) {
  return handle(() => {
    const params = request.nextUrl.searchParams;
    const periodo = parsePeriodo(params);
    return getDepartamentos(
      parseNivel(params),
      periodo,
      periodoComparacao(periodo, parseComparacao(params)),
      parseFiliais(params),
      parseOrigem(params),
    );
  });
}
