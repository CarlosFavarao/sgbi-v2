import type { Metadata } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { Metas } from "@/features/metas/components/metas";

export const metadata: Metadata = { title: "Metas · SGBI" };

export default function MetasPage() {
  return (
    <AppShell>
      <main className="flex-1 p-3">
        {/* TanStack Query reads the current time; Suspense keeps it out of the prerender. */}
        <Suspense>
          <Metas />
        </Suspense>
      </main>
    </AppShell>
  );
}
