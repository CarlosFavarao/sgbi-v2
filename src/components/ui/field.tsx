import type { ReactNode } from "react";

/** Rótulo pequeno acima de um controle de filtro. */
export function Field({
  label,
  children,
  htmlFor,
}: {
  label: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  const className = "text-xs font-medium text-muted-foreground";
  return (
    <div className="flex flex-col gap-1">
      {htmlFor ? (
        <label htmlFor={htmlFor} className={className}>
          {label}
        </label>
      ) : (
        <span className={className}>{label}</span>
      )}
      {children}
    </div>
  );
}
