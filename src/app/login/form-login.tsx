"use client";

import Icon from "@mdi/react";
import { mdiAlertCircleOutline, mdiEyeOffOutline, mdiEyeOutline } from "@mdi/js";
import { useSearchParams } from "next/navigation";
import { useActionState, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { entrar, type EstadoLogin } from "./actions";

const campo =
  "h-9 w-full rounded-lg border bg-card px-3 text-sm text-foreground shadow-xs outline-none transition-colors placeholder:text-muted-foreground hover:border-primary/60 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30";
const rotulo = "text-xs font-medium text-muted-foreground";

/** Formulário de login (D45): valida no VX pela action `entrar` e volta para a tela de `?de=`. */
export function FormLogin() {
  const de = useSearchParams().get("de") ?? "";
  const [estado, enviar, enviando] = useActionState<EstadoLogin, FormData>(entrar, {});
  const [manter, setManter] = useState(false);
  const [verSenha, setVerSenha] = useState(false);

  return (
    <form action={enviar} className="flex flex-col gap-4 p-6 md:p-8">
      <div className="mb-2 text-center">
        <h1 className="text-2xl font-bold text-primary">SGBI</h1>
        <p className="text-sm text-muted-foreground">Acesse a plataforma com o usuário do VX</p>
      </div>
      <input type="hidden" name="de" value={de} />

      <div className="flex flex-col gap-1">
        <label htmlFor="usuario" className={rotulo}>
          Usuário
        </label>
        <input
          id="usuario"
          name="usuario"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          autoFocus
          defaultValue={estado.usuario}
          className={campo}
          placeholder="usuário"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="senha" className={rotulo}>
          Senha
        </label>
        <div className="relative">
          <input
            id="senha"
            name="senha"
            type={verSenha ? "text" : "password"}
            autoComplete="current-password"
            required
            className={`${campo} pr-10`}
            placeholder="senha"
          />
          <button
            type="button"
            onClick={() => setVerSenha((v) => !v)}
            aria-label={verSenha ? "Esconder a senha" : "Mostrar a senha"}
            aria-pressed={verSenha}
            className="absolute inset-y-0 right-0 flex w-9 items-center justify-center rounded-r-lg text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Icon path={verSenha ? mdiEyeOffOutline : mdiEyeOutline} size={0.75} aria-hidden />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id="manter" checked={manter} onCheckedChange={setManter} />
        <label htmlFor="manter" className="cursor-pointer select-none text-sm">
          Mantenha-me conectado
        </label>
        {/* O Checkbox (Radix) é controlado; o valor vai no formulário por este campo. */}
        {manter && <input type="hidden" name="manter" value="on" />}
      </div>

      <div aria-live="polite" className="min-h-5">
        {estado.erro && !enviando && (
          <p className="flex items-start gap-1.5 text-sm text-error">
            <Icon path={mdiAlertCircleOutline} size={0.7} className="mt-px shrink-0" aria-hidden />
            {estado.erro}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={enviando}
        className="flex h-9 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-70"
      >
        {enviando ? (
          <>
            <Spinner className="size-4" /> Entrando…
          </>
        ) : (
          "Entrar"
        )}
      </button>
    </form>
  );
}
