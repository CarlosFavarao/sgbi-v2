"use client";

import Icon from "@mdi/react";
import { mdiDatabaseOffOutline, mdiLockOutline } from "@mdi/js";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Spinner } from "@/components/ui/spinner";
import { bloqueioDaTela, detalheDoBloqueio, TELAS, tituloDoBloqueio, type Tela } from "@/lib/acesso";
import { filiaisQuery, sessaoQuery } from "@/lib/api";
import { ContextoAcesso } from "./contexto";

/**
 * Entrada de cada tela (D46): espera o acesso do usuário (plataforma e
 * permissões), mostra só o aviso quando a tela inteira está indisponível e
 * disponibiliza o acesso para os cards (`useAcesso`). Assim nenhuma consulta
 * sai antes de se saber o que a plataforma tem.
 */
export function PortaoDaTela({ tela, children }: { tela: Tela; children: ReactNode }) {
  const sessao = useQuery(sessaoQuery());
  // Em paralelo: a lista de filiais é a primeira consulta de toda tela.
  useQuery(filiaisQuery());

  if (!sessao.data) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
        {sessao.isError ? (
          sessao.error.message
        ) : (
          <>
            <Spinner className="size-5 text-primary" /> Carregando…
          </>
        )}
      </div>
    );
  }

  const { acesso } = sessao.data;
  const bloqueio = bloqueioDaTela(acesso, tela);
  if (bloqueio) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-24 text-center">
        <Icon
          path={bloqueio.motivo === "plataforma" ? mdiDatabaseOffOutline : mdiLockOutline}
          size={1.4}
          className="text-muted-foreground"
          aria-hidden
        />
        <h1 className="text-lg font-semibold">{TELAS[tela].rotulo}</h1>
        <p className="text-sm font-medium text-muted-foreground">{tituloDoBloqueio(bloqueio)}</p>
        <p className="max-w-md text-sm text-muted-foreground">{detalheDoBloqueio(bloqueio)}</p>
      </div>
    );
  }

  return <ContextoAcesso value={{ acesso, tela }}>{children}</ContextoAcesso>;
}
