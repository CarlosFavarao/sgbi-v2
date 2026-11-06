import type { Metadata } from "next";
import { Suspense } from "react";
import { PortaoDaTela } from "@/components/acesso/portao-da-tela";
import { AppShell } from "@/components/app-shell";
import { Dfc } from "@/features/financeiro/components/dfc";

export const metadata: Metadata = { title: "DFC · Financeiro · SGBI" };

export default function DfcPage() {
  return (
    <AppShell>
      <main className="flex-1 p-3">
        {/* TanStack Query reads the current time; Suspense keeps it out of the prerender. */}
        <Suspense>
          <PortaoDaTela tela="dfc">
            <Dfc />
          </PortaoDaTela>
        </Suspense>
      </main>
    </AppShell>
  );
}
