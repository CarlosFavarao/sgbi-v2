import { Suspense } from "react";
import { PortaoDaTela } from "@/components/acesso/portao-da-tela";
import { AppShell } from "@/components/app-shell";
import { PainelExecutivo } from "@/features/painel-executivo/components/painel-executivo";

export default function Home() {
  return (
    <AppShell>
      <main className="flex-1 p-3">
        {/* TanStack Query reads the current time; Suspense keeps it out of the prerender. */}
        <Suspense>
          <PortaoDaTela tela="painel-executivo">
            <PainelExecutivo />
          </PortaoDaTela>
        </Suspense>
      </main>
    </AppShell>
  );
}
