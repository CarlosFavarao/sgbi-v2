import { describe, expect, it } from "vitest";
import {
  alterarItemBloco,
  alturaTotal,
  colide,
  COLUNAS,
  encontrar,
  mostrar,
  normalizar,
  ocultar,
  ocultos,
  ordenarBloco,
  posicionar,
  redimensionar,
  semMoverArrastado,
  trocar,
  type ItemLayout,
  type Layout,
  type Limites,
} from "./layout";

const item = (id: string, x: number, y: number, w: number, h: number, visivel = true): ItemLayout => ({
  id,
  x,
  y,
  w,
  h,
  visivel,
});

const layoutDe = (itens: ItemLayout[], blocos: Layout["blocos"] = {}): Layout => ({ versao: 1, itens, blocos });

const LIMITES: Limites = {
  a: { min: { w: 2, h: 2 }, max: { w: 12, h: 10 } },
  b: { min: { w: 2, h: 2 }, max: { w: 12, h: 10 } },
  c: { min: { w: 2, h: 2 }, max: { w: 12, h: 10 } },
  d: { min: { w: 2, h: 2 }, max: { w: 12, h: 10 } },
};

// a | b
// c (largura total)
const PADRAO = layoutDe([item("a", 0, 0, 6, 4), item("b", 6, 0, 6, 4), item("c", 0, 4, 12, 3)]);

/** Invariantes que valem depois de qualquer operação. */
function conferir(layout: Layout) {
  const visiveis = layout.itens.filter((i) => i.visivel);
  for (const i of layout.itens) {
    expect(i.x, `${i.id}.x`).toBeGreaterThanOrEqual(0);
    expect(i.y, `${i.id}.y`).toBeGreaterThanOrEqual(0);
    expect(i.x + i.w, `${i.id} passa das ${COLUNAS} colunas`).toBeLessThanOrEqual(COLUNAS);
  }
  // Nenhum par de cards visíveis se sobrepõe.
  for (let i = 0; i < visiveis.length; i++) {
    for (let j = i + 1; j < visiveis.length; j++) {
      expect(colide(visiveis[i], visiveis[j]), `${visiveis[i].id} × ${visiveis[j].id} sobrepostos`).toBe(false);
    }
  }
  // Compactado: ninguém tem espaço livre logo acima (ou está no topo ou encosta em outro).
  for (const v of visiveis) {
    if (v.y === 0) continue;
    const encosta = visiveis.some((o) => o !== v && colide({ ...v, y: v.y - 1 }, o));
    expect(encosta, `${v.id} com espaço vazio acima`).toBe(true);
  }
}

describe("colide", () => {
  it("caixas que só se tocam nas bordas não colidem", () => {
    expect(colide({ x: 0, y: 0, w: 6, h: 4 }, { x: 6, y: 0, w: 6, h: 4 })).toBe(false);
    expect(colide({ x: 0, y: 0, w: 6, h: 4 }, { x: 0, y: 4, w: 6, h: 4 })).toBe(false);
  });

  it("caixas que se cruzam colidem", () => {
    expect(colide({ x: 0, y: 0, w: 6, h: 4 }, { x: 5, y: 3, w: 6, h: 4 })).toBe(true);
  });
});

describe("alturaTotal", () => {
  it("é a linha seguinte ao card visível mais baixo, ignorando ocultos", () => {
    expect(alturaTotal(PADRAO)).toBe(7);
    expect(alturaTotal(layoutDe([item("a", 0, 0, 6, 4), item("b", 0, 10, 6, 4, false)]))).toBe(4);
    expect(alturaTotal(layoutDe([]))).toBe(0);
  });
});

describe("posicionar", () => {
  it("mover um card sobre outro empurra quem estava lá para baixo, sem sobrepor", () => {
    const r = posicionar(PADRAO, "c", 0, 0, LIMITES);
    conferir(r);
    expect(encontrar(r, "c")).toMatchObject({ x: 0, y: 0, w: 12 });
    // a e b descem para baixo de c.
    expect(encontrar(r, "a")!.y).toBe(3);
    expect(encontrar(r, "b")!.y).toBe(3);
  });

  it("mantém o tamanho dos cards ao mover", () => {
    const r = posicionar(PADRAO, "a", 3, 8, LIMITES);
    conferir(r);
    expect(encontrar(r, "a")).toMatchObject({ w: 6, h: 4 });
  });

  it("não deixa o card passar da última coluna", () => {
    const r = posicionar(PADRAO, "a", 11, 0, LIMITES);
    conferir(r);
    expect(encontrar(r, "a")!.x).toBe(6); // 12 colunas − largura 6
  });

  it("o card solto no vazio lá embaixo sobe até encostar (sem espaço vazio)", () => {
    const r = posicionar(PADRAO, "a", 0, 30, LIMITES);
    conferir(r);
    expect(encontrar(r, "a")!.y).toBeLessThan(30);
  });
});

describe("trocar", () => {
  it("cada card vai para a posição do outro", () => {
    const r = trocar(PADRAO, "a", "b", LIMITES);
    conferir(r);
    expect(encontrar(r, "a")).toMatchObject({ x: 6, y: 0 });
    expect(encontrar(r, "b")).toMatchObject({ x: 0, y: 0 });
  });

  it("trocar um card com ele mesmo, ou com id inexistente, não muda nada", () => {
    expect(trocar(PADRAO, "a", "a", LIMITES)).toBe(PADRAO);
    expect(trocar(PADRAO, "a", "zzz", LIMITES)).toBe(PADRAO);
  });

  it("cards de tamanhos diferentes não ficam sobrepostos depois da troca", () => {
    const r = trocar(PADRAO, "a", "c", LIMITES);
    conferir(r);
    expect(r.itens).toHaveLength(3);
  });
});

describe("redimensionar", () => {
  it("crescer para baixo empurra quem está embaixo", () => {
    const r = redimensionar(PADRAO, "a", { x: 0, y: 0, w: 6, h: 6 }, "b", LIMITES);
    conferir(r);
    expect(encontrar(r, "a")!.h).toBe(6);
    expect(encontrar(r, "c")!.y).toBeGreaterThanOrEqual(6);
  });

  it("respeita o tamanho mínimo e o máximo", () => {
    const menor = redimensionar(PADRAO, "a", { x: 0, y: 0, w: 1, h: 1 }, "br", LIMITES);
    expect(encontrar(menor, "a")).toMatchObject({ w: 2, h: 2 });
    const maior = redimensionar(PADRAO, "a", { x: 0, y: 0, w: 99, h: 99 }, "br", LIMITES);
    expect(encontrar(maior, "a")!.h).toBe(10);
    expect(encontrar(maior, "a")!.x + encontrar(maior, "a")!.w).toBeLessThanOrEqual(COLUNAS);
    conferir(maior);
  });

  it("pela borda esquerda, a borda direita fica parada", () => {
    const r = redimensionar(PADRAO, "b", { x: 8, y: 0, w: 4, h: 4 }, "l", LIMITES);
    const b = encontrar(r, "b")!;
    expect(b.x + b.w).toBe(12);
    expect(b.w).toBe(4);
  });

  it("sem mudança devolve o mesmo layout (mesma referência)", () => {
    expect(redimensionar(PADRAO, "a", { x: 0, y: 0, w: 6, h: 4 }, "br", LIMITES)).toBe(PADRAO);
  });

  it("id inexistente não muda nada", () => {
    expect(redimensionar(PADRAO, "zzz", { x: 0, y: 0, w: 3, h: 3 }, "br", LIMITES)).toBe(PADRAO);
  });
});

describe("ocultar e mostrar", () => {
  it("ocultar faz os de baixo subirem; o oculto guarda a posição", () => {
    const r = ocultar(ocultar(PADRAO, "a"), "b");
    conferir(r);
    expect(encontrar(r, "a")).toMatchObject({ visivel: false, x: 0, y: 0, w: 6, h: 4 });
    expect(encontrar(r, "c")!.y).toBe(0);
  });

  it("ocultar um só não faz subir quem ainda é segurado por outro card", () => {
    const r = ocultar(PADRAO, "a");
    conferir(r);
    expect(encontrar(r, "c")!.y).toBe(4); // c é largo e o b continua em cima dele
  });

  it("mostrar volta para o lugar de antes e empurra quem estiver lá", () => {
    const r = mostrar(ocultar(PADRAO, "a"), "a");
    conferir(r);
    expect(encontrar(r, "a")).toMatchObject({ visivel: true, x: 0, y: 0 });
    expect(r.itens.filter((i) => i.visivel)).toHaveLength(3);
  });

  it("ocultos lista os ids ocultos dos cards e dos blocos", () => {
    const layout = layoutDe([item("a", 0, 0, 6, 4, false), item("b", 6, 0, 6, 4)], {
      kpis: [item("k1", 0, 0, 1, 1, false), item("k2", 0, 0, 1, 1)],
    });
    expect(ocultos(layout)).toEqual({ cards: ["a"], blocos: { kpis: ["k1"] } });
  });
});

describe("sequência de operações", () => {
  it("o layout continua válido depois de várias edições seguidas", () => {
    let l = PADRAO;
    l = posicionar(l, "c", 0, 0, LIMITES);
    conferir(l);
    l = redimensionar(l, "a", { x: 0, y: 0, w: 12, h: 5 }, "br", LIMITES);
    conferir(l);
    l = trocar(l, "a", "b", LIMITES);
    conferir(l);
    l = ocultar(l, "c");
    conferir(l);
    l = mostrar(l, "c");
    conferir(l);
    l = posicionar(l, "b", 6, 2, LIMITES);
    conferir(l);
    expect(l.itens.map((i) => i.id).sort()).toEqual(["a", "b", "c"]);
  });
});

describe("semMoverArrastado", () => {
  it("devolve o resultado novo, mas o card arrastado fica na origem", () => {
    const depois = posicionar(PADRAO, "a", 0, 8, LIMITES);
    const r = semMoverArrastado(PADRAO, depois, "a");
    expect(encontrar(r, "a")).toEqual(encontrar(PADRAO, "a"));
    expect(encontrar(r, "c")).toEqual(encontrar(depois, "c"));
  });
});

describe("normalizar (layout salvo no navegador)", () => {
  const padrao = layoutDe([item("a", 0, 0, 6, 4), item("b", 6, 0, 6, 4)], {
    kpis: [item("k1", 0, 0, 1, 1), item("k2", 0, 0, 1, 1), item("k3", 0, 0, 1, 1)],
  });

  it("sem layout salvo, usa o padrão", () => {
    expect(normalizar(null, padrao, LIMITES)).toBe(padrao);
    expect(normalizar(undefined, padrao, LIMITES)).toBe(padrao);
  });

  it("versão diferente descarta o salvo", () => {
    expect(normalizar({ ...padrao, versao: 99 }, padrao, LIMITES)).toBe(padrao);
  });

  it("salvo corrompido (itens que não é lista) cai no padrão", () => {
    expect(normalizar({ versao: 1, itens: "lixo" as never }, padrao, LIMITES)).toBe(padrao);
  });

  it("descarta ids que não existem mais e ignora duplicados", () => {
    const r = normalizar(
      { versao: 1, itens: [item("a", 0, 0, 6, 4), item("a", 0, 9, 6, 4), item("velho", 0, 0, 3, 3)], blocos: {} },
      padrao,
      LIMITES,
    );
    expect(r.itens.map((i) => i.id).sort()).toEqual(["a", "b"]);
  });

  it("card novo (que não estava salvo) entra embaixo de tudo, com o tamanho padrão", () => {
    const r = normalizar({ versao: 1, itens: [item("a", 0, 0, 6, 4)], blocos: {} }, padrao, LIMITES);
    conferir(r);
    expect(encontrar(r, "b")).toMatchObject({ x: 0, w: 6, h: 4 });
    expect(encontrar(r, "b")!.y).toBeGreaterThanOrEqual(4);
  });

  it("aplica os limites de tamanho e corrige números inválidos", () => {
    const r = normalizar(
      {
        versao: 1,
        itens: [
          { id: "a", x: -5, y: -2, w: 99, h: 0, visivel: true },
          { id: "b", x: Number.NaN, y: 3, w: 6, h: 4, visivel: true },
        ],
        blocos: {},
      },
      padrao,
      LIMITES,
    );
    conferir(r);
    const a = encontrar(r, "a")!;
    expect(a.w).toBeLessThanOrEqual(COLUNAS);
    expect(a.h).toBeGreaterThanOrEqual(2);
  });

  it("desfaz sobreposição de um layout salvo antigo", () => {
    const r = normalizar(
      { versao: 1, itens: [item("a", 0, 0, 8, 4), item("b", 4, 0, 8, 4)], blocos: {} },
      padrao,
      LIMITES,
    );
    conferir(r);
  });

  it("visível ausente no salvo conta como visível; false é respeitado", () => {
    const r = normalizar(
      { versao: 1, itens: [item("a", 0, 0, 6, 4, false), { ...item("b", 6, 0, 6, 4), visivel: undefined as never }], blocos: {} },
      padrao,
      LIMITES,
    );
    expect(encontrar(r, "a")!.visivel).toBe(false);
    expect(encontrar(r, "b")!.visivel).toBe(true);
  });

  it("blocos: mantém a ordem e a largura salvas (de 1 a 3) e acrescenta os itens novos no fim", () => {
    const r = normalizar(
      {
        versao: 1,
        itens: padrao.itens,
        blocos: { kpis: [item("k2", 0, 0, 9, 1), item("k1", 0, 0, 2, 1, false), item("fantasma", 0, 0, 1, 1)] },
      },
      padrao,
      LIMITES,
    );
    expect(r.blocos.kpis.map((i) => i.id)).toEqual(["k2", "k1", "k3"]);
    expect(r.blocos.kpis[0].w).toBe(3); // 9 limitado a 3
    expect(r.blocos.kpis[1]).toMatchObject({ w: 2, visivel: false });
  });

  it("bloco ausente no salvo volta ao padrão", () => {
    const r = normalizar({ versao: 1, itens: padrao.itens }, padrao, LIMITES);
    expect(r.blocos.kpis.map((i) => i.id)).toEqual(["k1", "k2", "k3"]);
  });
});

describe("blocos internos (KPIs)", () => {
  const layout = layoutDe([], {
    kpis: [item("k1", 0, 0, 1, 1), item("k2", 0, 0, 1, 1), item("k3", 0, 0, 1, 1, false)],
  });

  it("alterarItemBloco muda só o item pedido", () => {
    const r = alterarItemBloco(layout, "kpis", "k2", { w: 3, visivel: false });
    expect(r.blocos.kpis[1]).toMatchObject({ w: 3, visivel: false });
    expect(r.blocos.kpis[0]).toEqual(layout.blocos.kpis[0]);
  });

  it("ordenarBloco põe os ids na ordem dada e os ocultos no fim", () => {
    const r = ordenarBloco(layout, "kpis", ["k2", "k1"]);
    expect(r.blocos.kpis.map((i) => i.id)).toEqual(["k2", "k1", "k3"]);
  });
});
