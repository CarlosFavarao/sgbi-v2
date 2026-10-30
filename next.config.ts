import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `next dev` só aceita localhost por padrão; libera o acesso pela rede
  // interna (ex.: http://172.16.101.153:3000). Não afeta o build de produção.
  allowedDevOrigins: ["172.16.*.*"],
  // O canto inferior esquerdo é da barra lateral.
  devIndicators: { position: "bottom-right" },
  serverExternalPackages: ["mysql2"],
  experimental: {
    optimizePackageImports: ["@mdi/js"],
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
