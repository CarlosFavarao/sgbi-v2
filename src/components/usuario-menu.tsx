"use client";

import Icon from "@mdi/react";
import { mdiAccountCircleOutline, mdiLogout } from "@mdi/js";
import { useQuery } from "@tanstack/react-query";
import { useTransition } from "react";
import { sair } from "@/app/login/actions";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { sessaoQuery } from "@/lib/api";

/**
 * Usuário logado e "Sair" (D45), na barra lateral. Ao sair, a página recarrega
 * em /login, o que também limpa o cache do React Query.
 */
export function UsuarioMenu({ expandido = false, lado = "right" }: { expandido?: boolean; lado?: "right" | "bottom" }) {
  const usuario = useQuery(sessaoQuery()).data?.usuario;
  const [saindo, iniciar] = useTransition();
  const rotulo = usuario?.nome ?? "Usuário";

  return (
    <Popover>
      <PopoverTrigger
        aria-label={`Usuário: ${rotulo}`}
        className={`flex h-9 w-full items-center gap-3 rounded-lg px-[9px] text-sm font-medium outline-none transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white data-[state=open]:bg-white/20 ${
          lado === "bottom" ? "w-9 justify-center px-0" : ""
        }`}
      >
        <Icon path={mdiAccountCircleOutline} size={0.85} className="shrink-0" aria-hidden />
        {lado === "right" && (
          <span
            className={`truncate whitespace-nowrap transition-opacity duration-150 ${expandido ? "opacity-100" : "opacity-0"}`}
          >
            {rotulo}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent side={lado} align="end" className="w-60 p-1.5">
        <div className="px-2.5 py-2">
          <p className="truncate text-sm font-semibold">{usuario?.nome ?? "…"}</p>
          {usuario && usuario.nome !== usuario.login && (
            <p className="truncate text-xs text-muted-foreground">{usuario.login}</p>
          )}
        </div>
        <div className="my-1 h-px bg-border" />
        <button
          type="button"
          disabled={saindo}
          onClick={() =>
            iniciar(async () => {
              try {
                await sair();
              } finally {
                // Mesmo se a sessão já tiver vencido. Recarga completa de propósito: não sobra nada do
                // usuário anterior na memória (cache, estado).
                // eslint-disable-next-line @next/next/no-location-assign-relative-destination
                window.location.assign("/login");
              }
            })
          }
          className="flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-sm text-error outline-none transition-colors hover:bg-secondary focus-visible:bg-secondary disabled:opacity-70"
        >
          {saindo ? <Spinner className="size-4" /> : <Icon path={mdiLogout} size={0.7} aria-hidden />}
          Sair
        </button>
      </PopoverContent>
    </Popover>
  );
}
