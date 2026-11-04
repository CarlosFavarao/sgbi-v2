"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type AbaModulo = { href: string; label: string };

/** Abas de navegação entre as telas de um módulo (ex.: Financeiro → Fluxo de Caixa, DFC). */
export function AbasModulo({ abas, label }: { abas: AbaModulo[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="inline-flex h-9 rounded-lg bg-secondary p-1">
      {abas.map((aba) => {
        const ativa = pathname === aba.href;
        return (
          <Link
            key={aba.href}
            href={aba.href}
            aria-current={ativa ? "page" : undefined}
            className={`flex items-center rounded-md px-3 text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-ring ${
              ativa ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {aba.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Telas do módulo Financeiro (as outras abas do print estão na pendência P49). */
export const ABAS_FINANCEIRO: AbaModulo[] = [
  { href: "/financeiro", label: "Fluxo de Caixa" },
  { href: "/financeiro/dfc", label: "DFC" },
];
