import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { DfcPendente } from "@/features/financeiro/components/dfc-pendente";

export const metadata: Metadata = { title: "DFC · Financeiro · SGBI" };

export default function DfcPage() {
  return (
    <AppShell>
      <main className="flex-1 p-3">
        <DfcPendente />
      </main>
    </AppShell>
  );
}
