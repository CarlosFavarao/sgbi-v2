import type { Metadata } from "next";
import { Suspense } from "react";
import { PortaoDaTela } from "@/components/acesso/portao-da-tela";
import { AppShell } from "@/components/app-shell";
import { Financeiro } from "@/features/financeiro/components/financeiro";

export const metadata: Metadata = { title: "Financeiro · SGBI" };

export default function FinanceiroPage() {
  return (
    <AppShell>
      <main className="flex-1 p-3">
        {/* TanStack Query reads the current time; Suspense keeps it out of the prerender. */}
        <Suspense>
          <PortaoDaTela tela="financeiro">
            <Financeiro />
          </PortaoDaTela>
        </Suspense>
      </main>
    </AppShell>
  );
}
