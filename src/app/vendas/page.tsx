import type { Metadata } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { Vendas } from "@/features/vendas/components/vendas";

export const metadata: Metadata = { title: "Vendas · SGBI" };

export default function VendasPage() {
  return (
    <AppShell>
      <main className="flex-1 p-3">
        {/* TanStack Query reads the current time; Suspense keeps it out of the prerender. */}
        <Suspense>
          <Vendas />
        </Suspense>
      </main>
    </AppShell>
  );
}
