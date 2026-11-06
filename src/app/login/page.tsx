import Icon from "@mdi/react";
import { mdiBadgeAccountOutline, mdiCardAccountDetailsOutline, mdiDomain, mdiServerNetwork } from "@mdi/js";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { formatCnpj } from "@/lib/format";
import { statusDoVx, type StatusVx } from "@/server/vx";
import pacote from "../../../package.json";
import { FormLogin } from "./form-login";

export const metadata: Metadata = { title: "Entrar · SGBI" };

function Linha({ icone, rotulo, children }: { icone: string; rotulo: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="flex shrink-0 items-center gap-2 opacity-85">
        <Icon path={icone} size={0.75} aria-hidden />
        {rotulo}
      </span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

function Situacao({ ativa }: { ativa: boolean | null }) {
  const texto = ativa === null ? "Verificando…" : ativa ? "Ativa" : "Inativa";
  const cor = ativa === null ? "bg-white/50" : ativa ? "bg-success" : "bg-error";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 px-2 py-0.5 text-xs">
      <span aria-hidden className={`size-2 rounded-full ${cor}`} />
      {texto}
    </span>
  );
}

/** Situação da API do VX e dados do cliente (`GET /status`), como na tela de login do BI antigo. */
async function InfoSistema() {
  await connection();
  const status: StatusVx | null = await statusDoVx().catch(() => null);
  const ativa = !!status?.versao;
  return (
    <>
      <Linha icone={mdiServerNetwork} rotulo="API do VX">
        <span className="flex flex-wrap items-center justify-end gap-2">
          {status?.versao && <span className="opacity-85">{status.versao}</span>}
          <Situacao ativa={ativa} />
        </span>
      </Linha>
      {ativa && (
        <>
          <Linha icone={mdiDomain} rotulo="Nome fantasia">
            {status.nomeFantasia || "—"}
          </Linha>
          <Linha icone={mdiCardAccountDetailsOutline} rotulo="CNPJ">
            {formatCnpj(status.cnpjFilialBase) || "—"}
          </Linha>
          <Linha icone={mdiBadgeAccountOutline} rotulo="Código do cliente (SGSCli)">
            {status.codigoCliente ?? "—"}
          </Linha>
        </>
      )}
    </>
  );
}

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-4">
      <div className="absolute right-3 top-3">
        <ThemeToggle />
      </div>
      <section className="grid w-full max-w-3xl overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-md md:grid-cols-2">
        {/* O formulário lê `?de=` (destino depois de entrar). */}
        <Suspense>
          <FormLogin />
        </Suspense>
        <div className="hidden flex-col gap-4 bg-header p-6 text-header-foreground md:flex md:p-8">
          <h2 className="text-base font-semibold">Informações do sistema</h2>
          <Suspense
            fallback={
              <Linha icone={mdiServerNetwork} rotulo="API do VX">
                <Situacao ativa={null} />
              </Linha>
            }
          >
            <InfoSistema />
          </Suspense>
        </div>
      </section>
      <p className="text-xs text-muted-foreground">Versão {pacote.version}</p>
    </main>
  );
}
