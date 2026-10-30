import { connection } from "next/server";
import { getFiliais } from "@/features/painel-executivo/server/data";
import { handle } from "@/features/painel-executivo/server/params";

export async function GET() {
  // Roda na requisição, não no build: o build (Docker) não tem acesso ao banco do cliente.
  await connection();
  return handle(() => getFiliais());
}
