import type { NextRequest } from "next/server";
import { getDre } from "@/features/dfc/server/data";
import { parseMeses } from "@/features/dfc/server/params";
import type { DreResponse } from "@/features/dfc/types";
import { handle, parseFiliais } from "@/server/params";

export async function GET(request: NextRequest) {
  return handle(async (): Promise<DreResponse> => {
    const params = request.nextUrl.searchParams;
    return { linhas: await getDre(parseMeses(params), parseFiliais(params)) };
  }, "dfc");
}
