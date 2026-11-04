import type { NextRequest } from "next/server";
import { getMetasDiarias } from "@/features/metas/server/data";
import { parseDepartamento } from "@/features/metas/server/params";
import type { MetasDiariasResponse } from "@/features/metas/types";
import { handle, parseFiliais, parsePeriodo } from "@/server/params";

export async function GET(request: NextRequest) {
  return handle(async (): Promise<MetasDiariasResponse> => {
    const params = request.nextUrl.searchParams;
    return { dias: await getMetasDiarias(parsePeriodo(params), parseFiliais(params), parseDepartamento(params)) };
  }, "metas");
}
