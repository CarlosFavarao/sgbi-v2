import type { NextRequest } from "next/server";
import { getCompromissos } from "@/features/financeiro/server/data";
import { parseDias, parseReferencia } from "@/features/financeiro/server/params";
import type { CompromissosResponse } from "@/features/financeiro/types";
import { handle, parseFiliais } from "@/server/params";

export async function GET(request: NextRequest) {
  return handle(async (): Promise<CompromissosResponse> => {
    const params = request.nextUrl.searchParams;
    return { compromissos: await getCompromissos(parseReferencia(params), parseDias(params), parseFiliais(params)) };
  }, "financeiro");
}
