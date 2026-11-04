import { connection } from "next/server";
import { getFiliais } from "@/server/filiais";
import { handle } from "@/server/params";

export async function GET() {
  // Roda na requisição, não no build: o build (Docker) não tem acesso ao banco do cliente.
  await connection();
  return handle(() => getFiliais(), "filiais");
}
