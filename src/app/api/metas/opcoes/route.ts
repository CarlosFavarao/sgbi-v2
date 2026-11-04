import type { NextRequest } from "next/server";
import { getOpcoes } from "@/features/metas/server/data";
import { handle, parseFiliais } from "@/server/params";

export async function GET(request: NextRequest) {
  return handle(() => getOpcoes(parseFiliais(request.nextUrl.searchParams)), "metas");
}
