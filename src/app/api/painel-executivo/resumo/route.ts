import type { NextRequest } from "next/server";
import { periodoComparacao } from "@/features/painel-executivo/date";
import { getDias } from "@/features/painel-executivo/server/data";
import {
  handle,
  parseComparacao,
  parseFiliais,
  parseOrigem,
  parsePeriodo,
} from "@/features/painel-executivo/server/params";
import type { ResumoResponse } from "@/features/painel-executivo/types";

export async function GET(request: NextRequest) {
  return handle(async (): Promise<ResumoResponse> => {
    const params = request.nextUrl.searchParams;
    const periodo = parsePeriodo(params);
    const anterior = periodoComparacao(periodo, parseComparacao(params));
    const filiais = parseFiliais(params);
    const origem = parseOrigem(params);

    const [diasAtual, diasAnterior] = await Promise.all([
      getDias(periodo, filiais, origem),
      getDias(anterior, filiais, origem),
    ]);

    return {
      atual: { periodo, dias: diasAtual },
      anterior: { periodo: anterior, dias: diasAnterior },
    };
  });
}
