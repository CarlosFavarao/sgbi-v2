import "server-only";

import { oneOf } from "@/server/params";
import type { FonteVendas } from "../types";

export function parseFonteVendas(fonte: string): FonteVendas {
  return oneOf(fonte, ["vendas", "cupons"], "fonte");
}
