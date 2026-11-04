import "server-only";

import { oneOf } from "@/server/params";
import type { Fonte } from "../types";

export function parseFonte(fonte: string): Fonte {
  return oneOf(fonte, ["vendas", "pdv", "cancelamentos", "despesas"], "fonte");
}
