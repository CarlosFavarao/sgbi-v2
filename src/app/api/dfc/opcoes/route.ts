import { connection } from "next/server";
import { getOpcoes } from "@/features/dfc/server/data";
import { handle } from "@/server/params";

export async function GET() {
  // Roda na requisição, não no build: o build (Docker) não tem acesso ao banco do cliente.
  await connection();
  return handle(() => getOpcoes(), "dfc");
}
