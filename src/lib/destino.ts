/**
 * Para onde voltar depois do login (`?de=`): só caminhos internos, para o
 * parâmetro não redirecionar para outro site; o resto vai para o Painel.
 */
export function destinoSeguro(valor: unknown): string {
  const destino = typeof valor === "string" ? valor : "";
  if (!destino.startsWith("/") || destino.startsWith("//") || destino.startsWith("/\\")) return "/";
  if (destino === "/login" || destino.startsWith("/login?") || destino.startsWith("/api/")) return "/";
  return destino;
}
