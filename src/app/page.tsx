import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { PainelExecutivo } from "@/features/painel-executivo/components/painel-executivo";

export default function Home() {
  return (
    <AppShell>
      <main className="flex-1 p-3">
        {/* TanStack Query reads the current time; Suspense keeps it out of the prerender. */}
        <Suspense>
          <PainelExecutivo />
        </Suspense>
      </main>
    </AppShell>
  );
}
