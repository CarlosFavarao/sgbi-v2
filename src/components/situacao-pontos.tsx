/** Legenda de situações no cabeçalho de tabela: um ponto colorido por situação possível (o nome fica no título). */
export function SituacaoPontos({ itens }: { itens: { label: string; classe: string }[] }) {
  return (
    <span className="inline-flex items-center justify-center gap-1.5">
      {itens.map((i) => (
        <span key={i.label} className={`size-2 rounded-full ${i.classe}`} title={i.label} aria-label={i.label} />
      ))}
    </span>
  );
}
