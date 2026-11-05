export type ItemLegenda = {
  nome: string;
  /** Cor da série (token CSS, ex.: var(--chart-1)). */
  cor: string;
  /** Padrão: quadrado. `linha` e `tracejada` para séries de linha. */
  forma?: "quadrado" | "circulo" | "linha" | "tracejada";
  opacidade?: number;
};

function Marca({ item }: { item: ItemLegenda }) {
  const { cor, forma = "quadrado", opacidade = 1 } = item;
  if (forma === "linha") return <span className="h-0.5 w-3.5 rounded-full" style={{ background: cor, opacity: opacidade }} />;
  if (forma === "tracejada") {
    return <span className="w-3.5 border-t-2 border-dashed" style={{ borderColor: cor, opacity: opacidade }} />;
  }
  return (
    <span
      className={`size-2.5 ${forma === "circulo" ? "rounded-full" : "rounded-sm"}`}
      style={{ background: cor, opacity: opacidade }}
    />
  );
}

/** Legenda de um gráfico (no card e na janela ampliada, onde fica maior). */
export function LegendaGrafico({ itens, grande }: { itens: ItemLegenda[]; grande?: boolean }) {
  return (
    <ul className={`flex flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground ${grande ? "text-sm" : "mt-0.5 text-xs"}`}>
      {itens.map((item) => (
        <li key={item.nome} className="flex items-center gap-1.5">
          <Marca item={item} />
          {item.nome}
        </li>
      ))}
    </ul>
  );
}
