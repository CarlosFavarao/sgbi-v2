"use client";

import Icon from "@mdi/react";
import { mdiClose } from "@mdi/js";
import { Dialog as Radix } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";

export const Dialog = Radix.Root;
export const DialogTrigger = Radix.Trigger;

/** Janela sobre a tela (listas completas, detalhes). Fecha com Esc, clique fora ou no X. */
export function DialogContent({
  titulo,
  descricao,
  children,
  className = "",
  ...props
}: Omit<ComponentProps<typeof Radix.Content>, "title"> & {
  titulo: ReactNode;
  descricao?: ReactNode;
}) {
  return (
    <Radix.Portal>
      <Radix.Overlay className="fixed inset-0 z-50 bg-black/40" />
      <Radix.Content
        className={`fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border bg-card text-card-foreground shadow-xl outline-none ${className}`}
        {...props}
      >
        <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-3">
          <div>
            <Radix.Title className="text-base font-semibold">{titulo}</Radix.Title>
            {descricao ? (
              <Radix.Description className="text-xs text-muted-foreground">{descricao}</Radix.Description>
            ) : (
              <Radix.Description className="sr-only">{titulo}</Radix.Description>
            )}
          </div>
          <Radix.Close
            aria-label="Fechar"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Icon path={mdiClose} size={0.8} />
          </Radix.Close>
        </div>
        {children}
      </Radix.Content>
    </Radix.Portal>
  );
}
