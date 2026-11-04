import type { NextRequest } from "next/server";
import { getMovimentos } from "@/features/financeiro/server/data";
import { parseReferencia } from "@/features/financeiro/server/params";
import type { MovimentosResponse } from "@/features/financeiro/types";
import { handle, parseFiliais, parsePeriodo } from "@/server/params";

export async function GET(request: NextRequest) {
  return handle(async (): Promise<MovimentosResponse> => {
    const params = request.nextUrl.searchParams;
    return { movimentos: await getMovimentos(parsePeriodo(params), parseReferencia(params), parseFiliais(params)) };
  }, "financeiro");
}
