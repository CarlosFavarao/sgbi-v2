import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { PainelExecutivo } from "@/features/painel-executivo/components/painel-executivo";

export default function Home() {
  return (
    <>
      <AppHeader />
      <main className="flex-1 p-4 lg:p-6">
        {/* TanStack Query reads the current time; Suspense keeps it out of the prerender. */}
        <Suspense>
          <PainelExecutivo />
        </Suspense>
      </main>
    </>
  );
}
