/**
 * Layout personalizável das telas (D43): linhas de 12 colunas. Cada card tem
 * coluna de início (`x`) e largura (`w`) na linha; os cards não se sobrepõem e
 * espaços vazios são permitidos em qualquer ponto da linha (o sistema não estica
 * cards para preencher). Funções puras: o estado e o `localStorage` ficam em
 * `src/components/layout/use-layout.ts`.
 */

export const COLUNAS = 12;
/** Largura máxima de um item de bloco (KPI), em colunas internas do bloco. */
export const MAX_COLUNAS_ITEM_BLOCO = 3;

/**
 * `x` = coluna de início (0 a 11) e `w` = largura em colunas; `h` em unidades de
 * linha. Nos blocos internos (KPIs) só `w` conta e a ordem é a da lista.
 */
export type ItemLayout = { id: string; x: number; w: number; h: number; visivel: boolean };
export type LinhaLayout = { id: string; itens: ItemLayout[] };
export type Layout = {
  versao: number;
  linhas: LinhaLayout[];
  /** Itens de blocos internos (ex.: os KPIs dentro do card `kpis`), por id do bloco. */
  blocos: Record<string, ItemLayout[]>;
};

export type Tamanho = { w: number; h: number };
export type LimitesCard = { min: Tamanho; max: Tamanho };
export type Limites = Record<string, LimitesCard>;
/** Bordas que podem ser arrastadas para redimensionar. */
export type Borda = "l" | "r" | "t" | "b" | "tl" | "tr" | "bl" | "br";

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
const SEM_LIMITE: LimitesCard = { min: { w: 1, h: 1 }, max: { w: COLUNAS, h: 40 } };
export const limitesDe = (limites: Limites, id: string) => limites[id] ?? SEM_LIMITE;

let sequencia = 0;
/** Id de linha nova (só precisa ser único dentro do layout). */
export const novaLinhaId = () => `linha-${Date.now().toString(36)}-${(sequencia++).toString(36)}`;

/** Linha e item de um card. */
export function encontrar(layout: Layout, id: string) {
  for (const linha of layout.linhas) {
    const item = linha.itens.find((i) => i.id === id);
    if (item) return { linha, item };
  }
  return null;
}

const visiveis = (linha: LinhaLayout, exceto?: string) =>
  linha.itens.filter((i) => i.visivel && i.id !== exceto).sort((a, b) => a.x - b.x);

/** Trechos livres da linha (colunas sem card visível), em ordem: `[inicio, fim)`. */
export function espacosLivres(linha: LinhaLayout, exceto?: string): { inicio: number; fim: number }[] {
  const livres: { inicio: number; fim: number }[] = [];
  let cursor = 0;
  for (const i of visiveis(linha, exceto)) {
    if (i.x > cursor) livres.push({ inicio: cursor, fim: i.x });
    cursor = Math.max(cursor, i.x + i.w);
  }
  if (cursor < COLUNAS) livres.push({ inicio: cursor, fim: COLUNAS });
  return livres;
}

/** Até onde um card pode ir para a esquerda e para a direita sem encostar nos vizinhos. */
function limitesNaLinha(linha: LinhaLayout, item: ItemLayout) {
  let esquerda = 0;
  let direita = COLUNAS;
  for (const outro of visiveis(linha, item.id)) {
    if (outro.x + outro.w <= item.x) esquerda = Math.max(esquerda, outro.x + outro.w);
    else if (outro.x >= item.x + item.w) direita = Math.min(direita, outro.x);
  }
  return { esquerda, direita };
}

/** Altura da linha (em unidades): a do card visível mais alto. */
export const alturaDaLinha = (linha: LinhaLayout) =>
  linha.itens.reduce((m, i) => (i.visivel ? Math.max(m, i.h) : m), 0);

/** Total de unidades de altura das linhas com cards visíveis (base do cálculo da altura da unidade). */
export const alturaTotal = (layout: Layout) => layout.linhas.reduce((t, l) => t + alturaDaLinha(l), 0);

const semLinhasVazias = (linhas: LinhaLayout[]) => linhas.filter((l) => l.itens.length > 0);

/**
 * Arruma os cards de uma linha sem sobreposição: respeita o `x` de cada um
 * (empurrando para a direita quem se sobrepõe) e encolhe, até o mínimo, os que
 * passam da coluna 12. O que ainda não couber fica oculto.
 */
function arrumarLinha(itens: ItemLayout[], limites: Limites): ItemLayout[] {
  const resultado = itens.map((i) => ({ ...i }));
  let cursor = 0;
  for (const item of resultado.filter((i) => i.visivel).sort((a, b) => a.x - b.x)) {
    const { min } = limitesDe(limites, item.id);
    item.x = Math.max(item.x, cursor);
    if (item.x + item.w > COLUNAS) item.w = Math.max(min.w, COLUNAS - item.x);
    if (item.x + item.w > COLUNAS) {
      item.visivel = false;
      continue;
    }
    cursor = item.x + item.w;
  }
  return resultado;
}

/**
 * Corrige um layout salvo contra o padrão atual: descarta ids que não existem
 * mais, acrescenta os cards novos numa linha no fim (tamanho padrão), aplica os
 * limites e desfaz sobreposições.
 */
export function normalizar(salvo: Partial<Layout> | null | undefined, padrao: Layout, limites: Limites): Layout {
  if (!salvo || salvo.versao !== padrao.versao || !Array.isArray(salvo.linhas)) return padrao;

  const padraoPorId = new Map(padrao.linhas.flatMap((l) => l.itens).map((i) => [i.id, i]));
  const vistos = new Set<string>();
  const linhas: LinhaLayout[] = [];

  for (const l of salvo.linhas) {
    if (!l || !Array.isArray(l.itens)) continue;
    const itens: ItemLayout[] = [];
    for (const i of l.itens) {
      if (!i || !padraoPorId.has(i.id) || vistos.has(i.id)) continue;
      vistos.add(i.id);
      const { min, max } = limitesDe(limites, i.id);
      itens.push({
        id: i.id,
        x: clamp(Math.round(Number(i.x) || 0), 0, COLUNAS - 1),
        w: clamp(Math.round(Number(i.w) || 0), min.w, max.w),
        h: clamp(Math.round(Number(i.h) || 0), min.h, max.h),
        visivel: i.visivel !== false,
      });
    }
    linhas.push({ id: typeof l.id === "string" && l.id ? l.id : novaLinhaId(), itens: arrumarLinha(itens, limites) });
  }

  const novos = [...padraoPorId.values()].filter((i) => !vistos.has(i.id));
  if (novos.length)
    linhas.push({
      id: novaLinhaId(),
      itens: arrumarLinha(
        novos.map((i) => ({ ...i })),
        limites,
      ),
    });

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

  return { versao: padrao.versao, linhas: semLinhasVazias(linhas), blocos };
}

const comItem = (layout: Layout, id: string, f: (item: ItemLayout, linha: LinhaLayout) => ItemLayout): Layout => ({
  ...layout,
  linhas: layout.linhas.map((l) => ({ ...l, itens: l.itens.map((i) => (i.id === id ? f(i, l) : i)) })),
});

/**
 * Redimensiona por uma borda: a borda arrastada vai para `x` (esquerda) ou
 * `x + w` (direita) desejados e a oposta fica parada. Respeita os limites do
 * card e os vizinhos da linha.
 */
export function redimensionar(
  layout: Layout,
  id: string,
  desejado: { x: number; w: number; h: number },
  borda: Borda,
  limites: Limites,
): Layout {
  const { min, max } = limitesDe(limites, id);
  return comItem(layout, id, (item, linha) => {
    const { esquerda, direita } = limitesNaLinha(linha, item);
    let ini = item.x;
    let fim = item.x + item.w;
    if (borda.includes("l")) ini = clamp(desejado.x, Math.max(esquerda, fim - max.w), fim - min.w);
    else if (borda.includes("r")) fim = clamp(desejado.x + desejado.w, ini + min.w, Math.min(direita, ini + max.w));
    if (fim - ini < min.w) return item;
    return { ...item, x: ini, w: fim - ini, h: clamp(desejado.h, min.h, max.h) };
  });
}

/** Até onde as bordas do card podem ir agora (para a prévia do redimensionamento), em colunas. */
export function faixaDeRedimensionamento(layout: Layout, id: string, limites: Limites) {
  const achado = encontrar(layout, id);
  if (!achado) return null;
  const { esquerda, direita } = limitesNaLinha(achado.linha, achado.item);
  const { min, max } = limitesDe(limites, id);
  const { x, w } = achado.item;
  return {
    /** Coluna mínima da borda esquerda. */
    esquerda: Math.max(esquerda, x + w - max.w),
    /** Coluna máxima da borda direita (exclusiva). */
    direita: Math.min(direita, x + max.w),
    min,
    max,
  };
}

/**
 * Onde o card cairia na linha, querendo começar na coluna `x`: no trecho livre
 * que contém o centro dele (ou no mais próximo), encolhendo até o mínimo se
 * preciso. `null` = a linha não tem espaço nem para a largura mínima.
 */
export function encaixe(
  layout: Layout,
  linhaId: string,
  id: string,
  x: number,
  limites: Limites,
): { x: number; w: number } | null {
  const achado = encontrar(layout, id);
  if (!achado) return null;
  const { min } = limitesDe(limites, id);
  const w = achado.item.w;
  const linha = layout.linhas.find((l) => l.id === linhaId);
  if (!linha) return { x: 0, w };
  const trechos = espacosLivres(linha, id).filter((t) => t.fim - t.inicio >= min.w);
  if (!trechos.length) return null;
  const centro = x + w / 2;
  const distancia = (t: { inicio: number; fim: number }) =>
    centro < t.inicio ? t.inicio - centro : centro > t.fim ? centro - t.fim : 0;
  const trecho = trechos.reduce((melhor, t) => (distancia(t) < distancia(melhor) ? t : melhor));
  const largura = Math.min(w, trecho.fim - trecho.inicio);
  return { x: clamp(x, trecho.inicio, trecho.fim - largura), w: largura };
}

/** Move o card para a linha `linhaId` (ou uma linha nova no fim, com `null`), começando na coluna `x`. */
export function posicionar(layout: Layout, id: string, linhaId: string | null, x: number, limites: Limites): Layout {
  const achado = encontrar(layout, id);
  if (!achado) return layout;
  const lugar = linhaId ? encaixe(layout, linhaId, id, x, limites) : { x: 0, w: achado.item.w };
  if (!lugar) return layout;
  const item = { ...achado.item, ...lugar };
  const semItem = layout.linhas.map((l) => ({ ...l, itens: l.itens.filter((i) => i.id !== id) }));
  const linhas = linhaId
    ? semItem.map((l) => (l.id === linhaId ? { ...l, itens: [...l.itens, item] } : l))
    : [...semItem, { id: novaLinhaId(), itens: [item] }];
  return { ...layout, linhas: semLinhasVazias(linhas) };
}

/**
 * Troca dois cards de lugar: cada um vai para a linha e a coluna do outro,
 * mantendo o próprio tamanho. Se não couber no lugar do outro (sem encostar nos
 * vizinhos), vai para uma linha nova logo abaixo daquela linha.
 */
export function trocar(layout: Layout, idA: string, idB: string): Layout {
  const a = encontrar(layout, idA);
  const b = encontrar(layout, idB);
  if (!a || !b || idA === idB) return layout;

  let linhas: LinhaLayout[] = layout.linhas.map((l) => ({
    ...l,
    itens: l.itens.filter((i) => i.id !== idA && i.id !== idB),
  }));

  const colocar = (item: ItemLayout, linhaId: string, xDesejado: number) => {
    const indice = linhas.findIndex((l) => l.id === linhaId);
    const linha = linhas[indice];
    // O trecho livre onde o outro card estava (somado aos vizinhos livres).
    const trecho = espacosLivres(linha).find((t) => t.inicio <= xDesejado && xDesejado < t.fim);
    if (trecho && trecho.fim - trecho.inicio >= item.w) {
      const x = clamp(xDesejado, trecho.inicio, trecho.fim - item.w);
      linhas[indice] = { ...linha, itens: [...linha.itens, { ...item, x }] };
      return;
    }
    // Grande demais para o lugar: linha nova logo abaixo.
    const nova = { id: novaLinhaId(), itens: [{ ...item, x: clamp(xDesejado, 0, COLUNAS - item.w) }] };
    linhas = [...linhas.slice(0, indice + 1), nova, ...linhas.slice(indice + 1)];
  };

  colocar(a.item, b.linha.id, b.item.x);
  colocar(b.item, a.linha.id, a.item.x);
  return { ...layout, linhas: semLinhasVazias(linhas) };
}

/**
 * Layout mostrado enquanto o card `idA` é arrastado sobre `idB`: o resultado da
 * troca para todos, menos o próprio `idA`, que continua no lugar de origem (é
 * ele que o dnd-kit está movendo). Assim `idB` desliza para o lugar novo antes de soltar.
 */
export function trocaVisual(layout: Layout, idA: string, idB: string): Layout {
  const origem = encontrar(layout, idA);
  if (!origem) return layout;
  const depois = trocar(layout, idA, idB);
  const linhas = depois.linhas.map((l) => ({ ...l, itens: l.itens.filter((i) => i.id !== idA) }));
  const indice = linhas.findIndex((l) => l.id === origem.linha.id);
  if (indice >= 0) linhas[indice] = { ...linhas[indice], itens: [...linhas[indice].itens, origem.item] };
  else {
    const posicao = Math.min(
      layout.linhas.findIndex((l) => l.id === origem.linha.id),
      linhas.length,
    );
    linhas.splice(posicao, 0, { id: origem.linha.id, itens: [origem.item] });
  }
  return { ...depois, linhas: semLinhasVazias(linhas) };
}

/** O espaço fica vazio onde o card estava (ele guarda a posição para voltar a ela). */
export function ocultar(layout: Layout, id: string): Layout {
  return comItem(layout, id, (item) => ({ ...item, visivel: false }));
}

/** Mostra de novo: no lugar original se houver espaço (encolhendo até o mínimo), senão numa linha nova no fim. */
export function mostrar(layout: Layout, id: string, limites: Limites): Layout {
  const achado = encontrar(layout, id);
  if (!achado) return layout;
  const { linha, item } = achado;
  const lugar = encaixe(layout, linha.id, id, item.x, limites);
  if (lugar) return comItem(layout, id, (i) => ({ ...i, ...lugar, visivel: true }));
  const semItem = layout.linhas.map((l) =>
    l.id === linha.id ? { ...l, itens: l.itens.filter((i) => i.id !== id) } : l,
  );
  return {
    ...layout,
    linhas: semLinhasVazias([...semItem, { id: novaLinhaId(), itens: [{ ...item, x: 0, visivel: true }] }]),
  };
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
    cards: layout.linhas
      .flatMap((l) => l.itens)
      .filter((i) => !i.visivel)
      .map((i) => i.id),
    blocos: Object.fromEntries(
      Object.entries(layout.blocos).map(([b, itens]) => [b, itens.filter((i) => !i.visivel).map((i) => i.id)]),
    ) as Record<string, string[]>,
  };
}
