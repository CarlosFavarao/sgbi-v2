import type { NextRequest } from "next/server";
import { getMeta } from "@/features/painel-executivo/server/data";
import {
  handle,
  parseFiliais,
  parseOrigem,
  parsePeriodo,
} from "@/server/params";
import { exigirAcesso } from "@/server/acesso";

export async function GET(request: NextRequest) {
  return handle(async () => {
    await exigirAcesso("painel-executivo", ["metas", "venda"]);
    const params = request.nextUrl.searchParams;
    return getMeta(parsePeriodo(params), parseFiliais(params), parseOrigem(params));
  }, "painel-executivo");
}
