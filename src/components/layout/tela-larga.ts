"use client";

import { useLayoutEffect, useState } from "react";

/** Telas `xl` ou maiores: grade de 12 colunas e edição. Abaixo, cards empilhados. */
export function useTelaLarga() {
  const [larga, setLarga] = useState(true);
  useLayoutEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const atualizar = () => setLarga(mq.matches);
    atualizar();
    mq.addEventListener("change", atualizar);
    return () => mq.removeEventListener("change", atualizar);
  }, []);
  return larga;
}
