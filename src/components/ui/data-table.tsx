"use client";

import Icon from "@mdi/react";
import { mdiArrowDown, mdiArrowUp, mdiChevronRight } from "@mdi/js";
import { Fragment, useState, type ReactNode } from "react";
import { Spinner } from "./spinner";

type Valor = number | string | null | undefined;

export type Coluna<T> = {
  id: string;
  /** Cabeçalho do nível 1 (colunas vizinhas com o mesmo título, ou o mesmo `grupo`, ficam sob um título só). */
  titulo: ReactNode;
  grupo?: string;
  /** Cabeçalho do nível 2. Se nenhuma coluna tem, a tabela fica com um nível só. */
  subtitulo?: ReactNode;
  /** Texto do cabeçalho para leitores de tela e dica (padrão: o título, se for texto). */
  rotulo?: string;
  cell: (linha: T, profundidade: number) => ReactNode;
  /** Padrão: à direita (números). */
  align?: "left" | "right" | "center";
  /** Linha divisória à esquerda da coluna. */
  divisor?: boolean;
  /** Valor usado para ordenar ao clicar no cabeçalho; sem ele a coluna não ordena. */
  ordenar?: (linha: T) => Valor;
  /** Classes extras do cabeçalho e das células (ex.: ocultar em card estreito). */
  className?: string;
  dica?: string;
};

type Arvore<T> = {
  abertas: ReadonlySet<string>;
  alternar: (chave: string) => void;
  /** A linha desta profundidade pode expandir? */
  expansivel: (profundidade: number) => boolean;
  /** Linhas filhas de uma linha aberta. */
  filhos: (linha: T, profundidade: number) => { linhas: T[]; carregando: boolean };
  rotuloVazio?: string;
  descricao: (linha: T) => string;
};

type Densidade = "normal" | "compacto" | "mini";

const DENSIDADES: Record<Densidade, { tabela: string; th: string; td: string; total: string }> = {
  normal: { tabela: "text-[13px]", th: "px-2.5 py-1.5 text-xs", td: "px-2.5 py-1", total: "px-2.5 py-1.5" },
  compacto: { tabela: "text-xs", th: "px-2 py-1 text-[11px]", td: "px-2 py-[3px]", total: "px-2 py-1" },
  mini: { tabela: "text-xs", th: "px-2 py-0.5 text-[11px]", td: "px-2 py-0.5", total: "px-2 py-1" },
};

const ALINHAMENTO = { left: "text-left", right: "text-right tabular-nums", center: "text-center" } as const;

type Ordenacao = { id: string; direcao: "asc" | "desc" };

function comparar(a: Valor, b: Valor) {
  if (typeof a === "string" || typeof b === "string") {
    return String(a).localeCompare(String(b), "pt-BR", { numeric: true, sensitivity: "base" });
  }
  return (a as number) - (b as number);
}

/**
 * Tabela padrão do projeto: cabeçalho em até dois níveis (com divisória entre
 * eles), ordenação ao clicar no cabeçalho, linhas expansíveis em árvore e linha
 * de total. Só desenha a `<table>`: quem usa cuida do card, da rolagem e do carregamento.
 */
export function DataTable<T>({
  colunas,
  linhas,
  chave,
  total,
  rotuloTotal,
  vazio = "Nenhum resultado.",
  arvore,
  classeLinha,
  aoClicar,
  linhaInteira,
  cabecalhoFixo = true,
  densidade = "normal",
}: {
  colunas: Coluna<T>[];
  linhas: T[];
  chave: (linha: T, profundidade: number) => string;
  /** Linha(s) de total no rodapé (mesmas células das demais linhas; `rotuloTotal` substitui a primeira coluna). */
  total?: T | T[];
  rotuloTotal?: string;
  /** Texto da tabela sem linhas; `null` não mostra nada (quem usa avisa por fora). */
  vazio?: ReactNode;
  arvore?: Arvore<T>;
  classeLinha?: (linha: T, profundidade: number, indice: number) => string;
  aoClicar?: (linha: T) => void;
  /** Linha que ocupa a tabela toda (ex.: título de um grupo de linhas). */
  linhaInteira?: (linha: T) => ReactNode | null;
  cabecalhoFixo?: boolean;
  densidade?: Densidade;
}) {
  const [ordenacao, setOrdenacao] = useState<Ordenacao | null>(null);
  const d = DENSIDADES[densidade];
  const totais = total === undefined ? [] : Array.isArray(total) ? total : [total];
  const doisNiveis = colunas.some((c) => c.subtitulo != null);
  const colunaOrdenada = colunas.find((c) => c.id === ordenacao?.id && c.ordenar);

  // Títulos do nível 1: colunas vizinhas do mesmo grupo viram um título só.
  const grupos: { chave: string; colunas: Coluna<T>[] }[] = [];
  for (const c of colunas) {
    const k = c.grupo ?? (typeof c.titulo === "string" ? c.titulo : c.id);
    const ultimo = grupos.at(-1);
    if (ultimo?.chave === k && doisNiveis && c.subtitulo != null) ultimo.colunas.push(c);
    else grupos.push({ chave: k, colunas: [c] });
  }

  const ordenarPor = (c: Coluna<T> | undefined) => {
    if (!c?.ordenar) return;
    setOrdenacao((atual) => {
      if (atual?.id !== c.id) {
        // Texto começa de A a Z; números, do maior para o menor.
        const amostra = linhas.map(c.ordenar!).find((v) => v != null);
        return { id: c.id, direcao: typeof amostra === "string" ? "asc" : "desc" };
      }
      const primeira = typeof linhas.map(c.ordenar!).find((v) => v != null) === "string" ? "asc" : "desc";
      return atual.direcao === primeira ? { id: c.id, direcao: primeira === "asc" ? "desc" : "asc" } : null;
    });
  };

  const ordenadas = (lista: T[]) => {
    if (!colunaOrdenada?.ordenar || !ordenacao) return lista;
    const valor = colunaOrdenada.ordenar;
    const sinal = ordenacao.direcao === "asc" ? 1 : -1;
    // Sem valor (—) sempre por último, em qualquer direção.
    return [...lista].sort((a, b) => {
      const va = valor(a);
      const vb = valor(b);
      if (va == null || vb == null) return va == null ? (vb == null ? 0 : 1) : -1;
      return sinal * comparar(va, vb);
    });
  };

  const estadoDe = (c: Coluna<T> | undefined) =>
    c && c.id === colunaOrdenada?.id ? ordenacao!.direcao : null;

  /** Célula de cabeçalho (função de render, não componente: não remonta a cada render). */
  const cabecalho = (
    chaveTh: string,
    coluna: Coluna<T>,
    conteudo: ReactNode,
    alvo: Coluna<T> | undefined,
    nivel1: boolean,
    atributos: { colSpan?: number; rowSpan?: number } = {},
  ) => {
    const direcao = estadoDe(alvo);
    const align = coluna.align ?? "right";
    // Com dois níveis, o título do nível 1 fica centralizado sobre as colunas (menos o da primeira).
    const alinhar = nivel1 && doisNiveis && align !== "left" ? "center" : align;
    const justificar = { left: "justify-start", right: "justify-end", center: "justify-center" }[alinhar];
    // Divisória do nível 1 na cor do card: o `border` do tema some contra o fundo do cabeçalho.
    const base = `${d.th} font-medium ${coluna.divisor ? "border-l" : ""} ${nivel1 && doisNiveis ? "shadow-[inset_0_-2px_0_var(--card)]" : ""}`;
    return (
      <th
        key={chaveTh}
        {...atributos}
        scope="col"
        aria-sort={direcao ? (direcao === "asc" ? "ascending" : "descending") : alvo?.ordenar ? "none" : undefined}
        title={coluna.dica}
        className={`${base} ${ALINHAMENTO[alinhar].replace(" tabular-nums", "")} ${coluna.className ?? ""}`}
      >
        {alvo?.ordenar ? (
          <button
            type="button"
            onClick={() => ordenarPor(alvo)}
            className={`inline-flex w-full items-center gap-0.5 rounded-sm whitespace-nowrap hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring ${justificar} ${direcao ? "text-foreground" : ""}`}
          >
            {conteudo}
            <span className="inline-flex size-3 shrink-0 items-center justify-center" aria-hidden>
              {direcao && <Icon path={direcao === "asc" ? mdiArrowUp : mdiArrowDown} size={0.5} />}
            </span>
          </button>
        ) : (
          conteudo
        )}
      </th>
    );
  };

  const primeiraOrdenavel = (cs: Coluna<T>[]) => cs.find((c) => c.ordenar);

  const celulas = (linha: T, profundidade: number, ehTotal?: boolean) =>
    colunas.map((c, i) => {
      const align = c.align ?? "right";
      const pad = ehTotal ? d.total : d.td;
      const classes = `${pad} ${ALINHAMENTO[align]} ${c.divisor ? "border-l" : ""} ${c.className ?? ""}`;
      if (i === 0 && ehTotal && rotuloTotal !== undefined) {
        return (
          <td key={c.id} className={`${classes} text-left`}>
            {rotuloTotal}
          </td>
        );
      }
      if (i === 0 && arvore) {
        const aberto = arvore.abertas.has(chave(linha, profundidade));
        return (
          <td
            key={c.id}
            className={`${classes} font-medium`}
            style={{ paddingLeft: `${0.5 + profundidade * 1.1}rem` }}
          >
            <span className="flex items-center gap-1">
              {arvore.expansivel(profundidade) ? (
                <button
                  type="button"
                  onClick={() => arvore.alternar(chave(linha, profundidade))}
                  aria-expanded={aberto}
                  aria-label={`${aberto ? "Recolher" : "Expandir"} ${arvore.descricao(linha)}`}
                  className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <Icon path={mdiChevronRight} size={0.7} className={`transition-transform ${aberto ? "rotate-90" : ""}`} />
                </button>
              ) : (
                <span className="w-5 shrink-0" />
              )}
              <span className={profundidade ? "font-normal" : ""}>{c.cell(linha, profundidade)}</span>
            </span>
          </td>
        );
      }
      return (
        <td key={c.id} className={classes}>
          {c.cell(linha, profundidade)}
        </td>
      );
    });

  function renderLinhas(lista: T[], profundidade: number): ReactNode {
    return ordenadas(lista).map((linha, indice) => {
      const k = chave(linha, profundidade);
      const inteira = linhaInteira?.(linha);
      const aberto = !!arvore?.abertas.has(k);
      const filhos = aberto && arvore ? arvore.filhos(linha, profundidade) : null;
      const recuo = { paddingLeft: `${2 + profundidade * 1.1}rem` };
      return (
        <Fragment key={k}>
          <tr
            onClick={aoClicar ? () => aoClicar(linha) : undefined}
            className={`border-t hover:bg-secondary/50 ${profundidade ? "bg-secondary/25" : ""} ${aoClicar ? "cursor-pointer" : ""} ${classeLinha?.(linha, profundidade, indice) ?? ""}`}
          >
            {inteira != null ? (
              <td colSpan={colunas.length}>{inteira}</td>
            ) : (
              celulas(linha, profundidade)
            )}
          </tr>
          {filhos?.carregando && (
            <tr className="border-t">
              <td colSpan={colunas.length} className="py-1.5 text-muted-foreground" style={recuo}>
                <span className="inline-flex items-center gap-2 text-xs">
                  <Spinner className="size-3.5" /> Carregando…
                </span>
              </td>
            </tr>
          )}
          {filhos && !filhos.carregando && !filhos.linhas.length && arvore?.rotuloVazio && (
            <tr className="border-t">
              <td colSpan={colunas.length} className="py-1.5 text-xs text-muted-foreground" style={recuo}>
                {arvore.rotuloVazio}
              </td>
            </tr>
          )}
          {filhos && !filhos.carregando && renderLinhas(filhos.linhas, profundidade + 1)}
        </Fragment>
      );
    });
  }

  return (
    // Sem quebra de linha: a tabela cresce até o conteúdo e o container de quem usa rola na horizontal.
    <table className={`w-full border-collapse whitespace-nowrap ${d.tabela}`}>
      <thead className={`${cabecalhoFixo ? "sticky top-0 z-10" : ""} bg-secondary text-muted-foreground`}>
        <tr>
          {grupos.map((g) => {
            const primeira = g.colunas[0];
            const semSubtitulo = doisNiveis && primeira.subtitulo == null;
            return cabecalho(
              primeira.id,
              primeira,
              primeira.titulo,
              semSubtitulo || !doisNiveis ? primeira : primeiraOrdenavel(g.colunas),
              true,
              { colSpan: g.colunas.length > 1 ? g.colunas.length : undefined, rowSpan: semSubtitulo ? 2 : undefined },
            );
          })}
        </tr>
        {doisNiveis && (
          <tr>
            {colunas
              .filter((c) => c.subtitulo != null)
              .map((c) => cabecalho(c.id, c, c.subtitulo, c, false))}
          </tr>
        )}
      </thead>
      <tbody>
        {renderLinhas(linhas, 0)}
        {!linhas.length && vazio !== null && (
          <tr>
            <td colSpan={colunas.length} className="py-8 text-center text-muted-foreground">
              {vazio}
            </td>
          </tr>
        )}
      </tbody>
      {totais.length > 0 && (
        <tfoot className="sticky bottom-0 bg-card font-semibold">
          {totais.map((t, i) => (
            <tr key={i} className={i === 0 ? "border-t-2" : "border-t"}>
              {celulas(t, 0, true)}
            </tr>
          ))}
        </tfoot>
      )}
    </table>
  );
}
