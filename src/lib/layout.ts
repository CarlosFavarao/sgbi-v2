/**
 * Layout personalizável das telas (D43): grade de 12 colunas e linhas de altura
 * fixa (unidades). Cada card tem posição (`x`, `y`) e tamanho (`w`, `h`); os
 * cards não se sobrepõem. Quando um card cresce, é movido ou trocado sobre
 * outro, quem ficar por baixo é empurrado para baixo; depois, todos sobem até
 * encostar no card de cima (ou no topo), sem mudar de tamanho, para não sobrar
 * espaço vazio acima deles (`compactar`). Na horizontal, os espaços continuam
 * permitidos. Funções puras: o estado e o `localStorage` ficam em
 * `src/components/layout/use-layout.ts`.
 */

export const COLUNAS = 12;
/** Largura máxima de um item de bloco (KPI), em colunas internas do bloco. */
export const MAX_COLUNAS_ITEM_BLOCO = 3;

/**
 * `x` = coluna (0 a 11), `y` = linha (unidade de altura, a partir de 0), `w` =
 * largura em colunas, `h` = altura em unidades. Nos blocos internos (KPIs) só
 * `w` conta e a ordem é a da lista.
 */
export type ItemLayout = { id: string; x: number; y: number; w: number; h: number; visivel: boolean };
export type Layout = {
  versao: number;
  itens: ItemLayout[];
  /** Itens de blocos internos (ex.: os KPIs dentro do card `kpis`), por id do bloco. */
  blocos: Record<string, ItemLayout[]>;
};

export type Tamanho = { w: number; h: number };
export type LimitesCard = { min: Tamanho; max: Tamanho };
export type Limites = Record<string, LimitesCard>;
/** Bordas que podem ser arrastadas para redimensionar. */
export type Borda = "l" | "r" | "t" | "b" | "tl" | "tr" | "bl" | "br";
export type Caixa = { x: number; y: number; w: number; h: number };

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
const SEM_LIMITE: LimitesCard = { min: { w: 1, h: 1 }, max: { w: COLUNAS, h: 40 } };
export const limitesDe = (limites: Limites, id: string) => limites[id] ?? SEM_LIMITE;

export const colide = (a: Caixa, b: Caixa) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

export const encontrar = (layout: Layout, id: string) => layout.itens.find((i) => i.id === id);

/** Linha seguinte ao card visível mais baixo (altura total ocupada, em unidades). */
export const alturaTotal = (layout: Layout) =>
  layout.itens.reduce((m, i) => (i.visivel ? Math.max(m, i.y + i.h) : m), 0);

/**
 * Sobe cada card visível, de cima para baixo, até encostar no de cima (ou no
 * topo), sem mudar o tamanho nem a coluna: não sobra espaço vazio acima de
 * nenhum card. Ocultos não contam (guardam a posição para voltar a ela).
 */
function compactar(itens: ItemLayout[]): ItemLayout[] {
  const colocados: ItemLayout[] = [];
  for (const item of itens.filter((i) => i.visivel).sort((a, b) => a.y - b.y || a.x - b.x)) {
    let y = item.y;
    while (y > 0 && !colocados.some((c) => colide({ ...item, y: y - 1 }, c))) y--;
    colocados.push(y === item.y ? item : { ...item, y });
  }
  const porId = new Map(colocados.map((i) => [i.id, i]));
  return itens.map((i) => porId.get(i.id) ?? i);
}

/**
 * Desfaz sobreposições e compacta: os cards de `primeiro` ficam onde estão (na
 * ordem dada) e os demais, de cima para baixo, descem até não encostar em
 * ninguém; depois todos sobem o que puderem (`compactar`). Ocultos não contam.
 */
function acomodar(itens: ItemLayout[], primeiro: string[] = []): ItemLayout[] {
  const fixos = primeiro.map((id) => itens.find((i) => i.id === id)).filter((i): i is ItemLayout => !!i);
  const resto = itens.filter((i) => !primeiro.includes(i.id)).sort((a, b) => a.y - b.y || a.x - b.x);
  const colocados: ItemLayout[] = [];
  for (const item of [...fixos, ...resto]) {
    if (!item.visivel) {
      colocados.push(item);
      continue;
    }
    let y = item.y;
    for (;;) {
      const batidos = colocados.filter((c) => c.visivel && colide({ ...item, y }, c));
      if (!batidos.length) break;
      y = Math.max(...batidos.map((c) => c.y + c.h));
    }
    colocados.push(y === item.y ? item : { ...item, y });
  }
  // Mantém a ordem original da lista (estável para o React e para o salvo).
  const porId = new Map(colocados.map((i) => [i.id, i]));
  return compactar(itens.map((i) => porId.get(i.id)!));
}

/** Card dentro da grade e dos limites de tamanho dele. */
function dentro(item: ItemLayout, limites: Limites): ItemLayout {
  const { min, max } = limitesDe(limites, item.id);
  const w = clamp(Math.round(item.w), min.w, Math.min(max.w, COLUNAS));
  return {
    ...item,
    w,
    h: clamp(Math.round(item.h), min.h, max.h),
    x: clamp(Math.round(item.x), 0, COLUNAS - w),
    y: Math.max(0, Math.round(item.y)),
  };
}

/**
 * Corrige um layout salvo contra o padrão atual: descarta ids que não existem
 * mais, acrescenta os cards novos embaixo de tudo (tamanho padrão), aplica os
 * limites, desfaz sobreposições e compacta.
 */
export function normalizar(salvo: Partial<Layout> | null | undefined, padrao: Layout, limites: Limites): Layout {
  if (!salvo || salvo.versao !== padrao.versao || !Array.isArray(salvo.itens)) return padrao;

  const padraoPorId = new Map(padrao.itens.map((i) => [i.id, i]));
  const vistos = new Set<string>();
  const itens: ItemLayout[] = [];
  for (const i of salvo.itens) {
    if (!i || !padraoPorId.has(i.id) || vistos.has(i.id)) continue;
    vistos.add(i.id);
    itens.push(
      dentro(
        {
          id: i.id,
          x: Number(i.x) || 0,
          y: Number(i.y) || 0,
          w: Number(i.w) || 0,
          h: Number(i.h) || 0,
          visivel: i.visivel !== false,
        },
        limites,
      ),
    );
  }
  let base = alturaTotal({ ...padrao, itens });
  for (const novo of padrao.itens.filter((i) => !vistos.has(i.id))) {
    itens.push({ ...novo, x: 0, y: base });
    base += novo.h;
  }

  const blocos: Record<string, ItemLayout[]> = {};
  for (const [bloco, itensPadrao] of Object.entries(padrao.blocos)) {
    const salvos = Array.isArray(salvo.blocos?.[bloco]) ? salvo.blocos[bloco] : [];
    const porId = new Map(itensPadrao.map((i) => [i.id, i]));
    const lista = salvos
      .filter((i) => i && porId.has(i.id))
      .map((i) => ({
        ...porId.get(i.id)!,
        w: clamp(Math.round(Number(i.w) || 1), 1, MAX_COLUNAS_ITEM_BLOCO),
        visivel: i.visivel !== false,
      }));
    const presentes = new Set(lista.map((i) => i.id));
    blocos[bloco] = [...lista, ...itensPadrao.filter((i) => !presentes.has(i.id)).map((i) => ({ ...i }))];
  }

  return { versao: padrao.versao, itens: acomodar(itens), blocos };
}

const comItem = (layout: Layout, id: string, f: (item: ItemLayout) => ItemLayout): Layout => ({
  ...layout,
  itens: layout.itens.map((i) => (i.id === id ? f(i) : i)),
});

/**
 * Novo tamanho (e posição, pelas bordas esquerda e de cima) do card, dentro da
 * grade e dos limites; a borda oposta à arrastada fica parada. Quem ficar por
 * baixo desce.
 */
export function redimensionar(layout: Layout, id: string, desejado: Caixa, borda: Borda, limites: Limites): Layout {
  const { min, max } = limitesDe(limites, id);
  const atual = encontrar(layout, id);
  if (!atual) return layout;
  let { x, y, w, h } = atual;
  if (borda.includes("l")) {
    const direita = atual.x + atual.w;
    x = clamp(desejado.x, Math.max(0, direita - max.w), direita - min.w);
    w = direita - x;
  } else if (borda.includes("r")) {
    w = clamp(desejado.w, min.w, Math.min(max.w, COLUNAS - x));
  }
  if (borda.includes("t")) {
    const base = atual.y + atual.h;
    y = clamp(desejado.y, Math.max(0, base - max.h), base - min.h);
    h = base - y;
  } else if (borda.includes("b")) {
    h = clamp(desejado.h, min.h, max.h);
  }
  if (x === atual.x && y === atual.y && w === atual.w && h === atual.h) return layout;
  return { ...layout, itens: acomodar(comItem(layout, id, (i) => ({ ...i, x, y, w, h })).itens, [id]) };
}

/** Move o card para a coluna `x` e a linha `y`; quem ficar por baixo desce. */
export function posicionar(layout: Layout, id: string, x: number, y: number, limites: Limites): Layout {
  const movido = comItem(layout, id, (i) => dentro({ ...i, x, y }, limites));
  return { ...layout, itens: acomodar(movido.itens, [id]) };
}

/**
 * Troca dois cards de lugar: cada um vai para o canto superior esquerdo do outro,
 * mantendo o próprio tamanho (ajustado para caber nas 12 colunas). Se ainda se
 * sobrepuserem, ou baterem em outros, quem estiver por baixo desce.
 */
export function trocar(layout: Layout, idA: string, idB: string, limites: Limites): Layout {
  const a = encontrar(layout, idA);
  const b = encontrar(layout, idB);
  if (!a || !b || idA === idB) return layout;
  const itens = layout.itens.map((i) =>
    i.id === idA
      ? dentro({ ...i, x: b.x, y: b.y }, limites)
      : i.id === idB
        ? dentro({ ...i, x: a.x, y: a.y }, limites)
        : i,
  );
  // Quem está mais acima fica parado; o outro desce se os dois ainda se sobrepuserem.
  const ordem = a.y <= b.y ? [idB, idA] : [idA, idB];
  return { ...layout, itens: acomodar(itens, ordem) };
}

/** Os cards de baixo sobem para o lugar dele (ele guarda a posição para voltar a ela). */
export function ocultar(layout: Layout, id: string): Layout {
  const oculto = comItem(layout, id, (item) => ({ ...item, visivel: false }));
  return { ...layout, itens: compactar(oculto.itens) };
}

/** Mostra de novo no lugar de antes (ou mais acima, se houver espaço); quem estiver lá desce. */
export function mostrar(layout: Layout, id: string): Layout {
  const visivel = comItem(layout, id, (i) => ({ ...i, visivel: true }));
  return { ...layout, itens: acomodar(visivel.itens, [id]) };
}

/**
 * Layout mostrado durante o arraste: o resultado de `depois` para todos, menos o
 * card arrastado, que continua no lugar de origem (é ele que o dnd-kit move).
 */
export function semMoverArrastado(antes: Layout, depois: Layout, id: string): Layout {
  const origem = encontrar(antes, id);
  if (!origem) return depois;
  return { ...depois, itens: depois.itens.map((i) => (i.id === id ? origem : i)) };
}

// ---------- Blocos internos (KPIs): uma lista em ordem, larguras de 1 a 3 colunas internas.

export function alterarItemBloco(layout: Layout, bloco: string, id: string, mudanca: Partial<ItemLayout>): Layout {
  return {
    ...layout,
    blocos: {
      ...layout.blocos,
      [bloco]: (layout.blocos[bloco] ?? []).map((i) => (i.id === id ? { ...i, ...mudanca } : i)),
    },
  };
}

/** Nova ordem dos itens visíveis de um bloco; os ocultos ficam no fim. */
export function ordenarBloco(layout: Layout, bloco: string, ids: string[]): Layout {
  const itens = layout.blocos[bloco] ?? [];
  const porId = new Map(itens.map((i) => [i.id, i]));
  return {
    ...layout,
    blocos: {
      ...layout.blocos,
      [bloco]: [...ids.map((id) => porId.get(id)!).filter(Boolean), ...itens.filter((i) => !i.visivel)],
    },
  };
}

/** Ids ocultos (cards da grade e itens de blocos). */
export function ocultos(layout: Layout) {
  return {
    cards: layout.itens.filter((i) => !i.visivel).map((i) => i.id),
    blocos: Object.fromEntries(
      Object.entries(layout.blocos).map(([b, itens]) => [b, itens.filter((i) => !i.visivel).map((i) => i.id)]),
    ) as Record<string, string[]>,
  };
}
