import type { NextRequest } from "next/server";
import { getMetasDiarias } from "@/features/metas/server/data";
import { parseDepartamento } from "@/features/metas/server/params";
import type { MetasDiariasResponse } from "@/features/metas/types";
import { handle, parseFiliais, parsePeriodo } from "@/server/params";
import { exigirAcesso } from "@/server/acesso";

export async function GET(request: NextRequest) {
  return handle(async (): Promise<MetasDiariasResponse> => {
    await exigirAcesso("metas", ["metas"]);
    const params = request.nextUrl.searchParams;
    return { dias: await getMetasDiarias(parsePeriodo(params), parseFiliais(params), parseDepartamento(params)) };
  }, "metas");
}
