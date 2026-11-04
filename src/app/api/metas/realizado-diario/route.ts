import type { NextRequest } from "next/server";
import { getRealizadoDiario } from "@/features/metas/server/data";
import { parseDepartamento } from "@/features/metas/server/params";
import type { RealizadoDiarioResponse } from "@/features/metas/types";
import { handle, parseFiliais, parseOrigem, parsePeriodo } from "@/server/params";

export async function GET(request: NextRequest) {
  return handle(async (): Promise<RealizadoDiarioResponse> => {
    const params = request.nextUrl.searchParams;
    const dias = await getRealizadoDiario(
      parsePeriodo(params),
      parseFiliais(params),
      parseOrigem(params),
      parseDepartamento(params),
    );
    return { dias };
  }, "metas");
}
