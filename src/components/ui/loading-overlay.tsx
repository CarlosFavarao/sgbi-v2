import { Spinner } from "./spinner";

/**
 * Cobre e desfoca o conteúdo (os dados ficam ilegíveis) com um spinner na
 * frente enquanto carrega. O elemento pai precisa de `relative`; passe o
 * arredondamento do pai em `className` (ex.: `rounded-2xl`).
 */
export function LoadingOverlay({
  ativo,
  label = "Carregando…",
  className = "",
}: {
  ativo: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-hidden={!ativo}
      className={`absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 bg-loading-scrim text-loading-foreground backdrop-blur-[6px] transition-opacity duration-200 ${
        ativo ? "opacity-100" : "pointer-events-none opacity-0"
      } ${className}`}
    >
      {ativo && (
        <>
          <Spinner className="size-6" />
          <span className="max-w-[90%] truncate text-xs font-medium">{label}</span>
        </>
      )}
    </div>
  );
}
