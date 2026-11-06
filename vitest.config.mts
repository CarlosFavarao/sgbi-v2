import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Testes de regressão das regras de negócio (funções puras, sem banco nem navegador).
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // O pacote "server-only" lança erro fora do servidor do Next; nos testes, vazio.
      "server-only": fileURLToPath(new URL("./src/test/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
