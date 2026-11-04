import type { NextRequest } from "next/server";
import { getPrazos } from "@/features/financeiro/server/data";
import { handle, parseFiliais, parsePeriodo } from "@/server/params";

export async function GET(request: NextRequest) {
  return handle(() => {
    const params = request.nextUrl.searchParams;
    return getPrazos(parsePeriodo(params), parseFiliais(params));
  }, "financeiro");
}
