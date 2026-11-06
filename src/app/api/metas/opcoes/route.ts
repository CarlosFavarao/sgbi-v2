import type { NextRequest } from "next/server";
import { getOpcoes } from "@/features/metas/server/data";
import { handle, parseFiliais } from "@/server/params";
import { exigirAcesso } from "@/server/acesso";

export async function GET(request: NextRequest) {
  return handle(async () => {
    await exigirAcesso("metas", ["metas"]);
    return getOpcoes(parseFiliais(request.nextUrl.searchParams));
  }, "metas");
}
