import type { Metadata } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { Dfc } from "@/features/dfc/components/dfc";

export const metadata: Metadata = { title: "DFC · Financeiro · SGBI" };

export default function DfcPage() {
  return (
    <AppShell>
      <main className="flex-1 p-3">
        {/* TanStack Query reads the current time; Suspense keeps it out of the prerender. */}
        <Suspense>
          <Dfc />
        </Suspense>
      </main>
    </AppShell>
  );
}
