import "server-only";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variável de ambiente ausente: ${name}`);
  return value;
}

export const env = {
  apiView: required("API_VIEW"),
  /**
   * Segredo que assina o cookie de sessão (D45). Lido só quando usado, para o
   * build sem `.env` continuar funcionando.
   */
  get jwtSecret() {
    const valor = required("JWT_SECRET");
    if (valor.length < 32) throw new Error("JWT_SECRET deve ter pelo menos 32 caracteres.");
    return valor;
  },
  /**
   * Opcional: força a plataforma (`vx`, `cloud` ou `fivewin`) no lugar da que o
   * login do VX informa, para testar em homologação o que cada uma mostra (D46).
   */
  get plataforma(): string | undefined {
    return process.env.PLATAFORMA?.trim() || undefined;
  },
  /** Identifica a instalação quando há mais de um SGBI no mesmo endereço (cookie próprio). */
  get clientSlug() {
    return (process.env.CLIENT_SLUG ?? "").trim().replace(/^\/+|\/+$/g, "");
  },
  db: {
    host: required("DB_HOST"),
    port: Number(process.env.DB_PORT ?? 3306),
    user: required("DB_USER"),
    password: required("DB_PASSWORD"),
    database: required("DB_DATABASE"),
  },
};
