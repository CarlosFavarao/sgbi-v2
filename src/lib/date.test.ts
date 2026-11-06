import { describe, expect, it } from "vitest";
import {
  addDays,
  daysBetween,
  daysInMonth,
  eachDay,
  firstDayOfMonth,
  lastDayOfMonth,
  mesesDoPeriodo,
  periodoComparacao,
  resolverAtalhoComparacao,
  startOfWeek,
} from "./date";

describe("aritmética de datas ISO", () => {
  it("addDays atravessa mês e ano", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2025-12-31", 1)).toBe("2026-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("daysBetween é a diferença em dias corridos (fim − início)", () => {
    expect(daysBetween("2026-11-01", "2026-11-01")).toBe(0);
    expect(daysBetween("2026-11-01", "2026-11-30")).toBe(29);
    expect(daysBetween("2026-12-31", "2026-01-01")).toBe(-364);
  });

  it("daysInMonth respeita ano bissexto", () => {
    expect(daysInMonth("2026-02-10")).toBe(28);
    expect(daysInMonth("2024-02-10")).toBe(29);
    expect(daysInMonth("2026-04-01")).toBe(30);
    expect(daysInMonth("2026-12-31")).toBe(31);
  });

  it("primeiro e último dia do mês", () => {
    expect(firstDayOfMonth("2026-11-17")).toBe("2026-11-01");
    expect(lastDayOfMonth("2026-11-17")).toBe("2026-11-30");
    expect(lastDayOfMonth("2024-02-03")).toBe("2024-02-29");
  });

  it("eachDay inclui as duas pontas", () => {
    expect(eachDay({ inicio: "2026-02-27", fim: "2026-03-02" })).toEqual([
      "2026-02-27",
      "2026-02-28",
      "2026-03-01",
      "2026-03-02",
    ]);
    expect(eachDay({ inicio: "2026-11-06", fim: "2026-11-06" })).toEqual(["2026-11-06"]);
  });

  it("startOfWeek devolve a segunda-feira (domingo pertence à semana anterior)", () => {
    expect(startOfWeek("2026-11-06")).toBe("2026-11-02"); // sexta
    expect(startOfWeek("2026-11-02")).toBe("2026-11-02"); // segunda
    expect(startOfWeek("2026-11-08")).toBe("2026-11-02"); // domingo
    expect(startOfWeek("2026-11-09")).toBe("2026-11-09"); // próxima segunda
  });
});

describe("mesesDoPeriodo", () => {
  it("lista os meses cobertos, virando o ano", () => {
    expect(mesesDoPeriodo({ inicio: "2025-11-15", fim: "2026-02-03" })).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
  });

  it("um único mês", () => {
    expect(mesesDoPeriodo({ inicio: "2026-11-01", fim: "2026-11-30" })).toEqual(["2026-11"]);
  });
});

describe("período de comparação", () => {
  it("período anterior de intervalo livre tem o mesmo tamanho e termina na véspera", () => {
    expect(resolverAtalhoComparacao({ inicio: "2026-11-08", fim: "2026-11-14" }, "periodo-anterior")).toEqual({
      inicio: "2026-11-01",
      fim: "2026-11-07",
    });
  });

  it("período anterior de meses cheios recua em meses (nov → out inteiro, não 30 dias)", () => {
    expect(resolverAtalhoComparacao({ inicio: "2026-11-01", fim: "2026-11-30" }, "periodo-anterior")).toEqual({
      inicio: "2026-10-01",
      fim: "2026-10-31",
    });
  });

  it("período anterior de vários meses cheios recua a mesma quantidade de meses", () => {
    expect(resolverAtalhoComparacao({ inicio: "2026-01-01", fim: "2026-03-31" }, "periodo-anterior")).toEqual({
      inicio: "2025-10-01",
      fim: "2025-12-31",
    });
  });

  it("semana anterior recua 7 dias", () => {
    expect(resolverAtalhoComparacao({ inicio: "2026-11-02", fim: "2026-11-06" }, "semana-anterior")).toEqual({
      inicio: "2026-10-26",
      fim: "2026-10-30",
    });
  });

  it("mês anterior de mês cheio continua cheio (mar → fev inteiro)", () => {
    expect(resolverAtalhoComparacao({ inicio: "2026-03-01", fim: "2026-03-31" }, "mes-anterior")).toEqual({
      inicio: "2026-02-01",
      fim: "2026-02-28",
    });
  });

  it("mês anterior de intervalo parcial limita o dia ao fim do mês (31/03 → 28/02)", () => {
    expect(resolverAtalhoComparacao({ inicio: "2026-03-01", fim: "2026-03-31" }, "mes-anterior").fim).toBe("2026-02-28");
    expect(resolverAtalhoComparacao({ inicio: "2026-03-10", fim: "2026-03-31" }, "mes-anterior")).toEqual({
      inicio: "2026-02-10",
      fim: "2026-02-28",
    });
  });

  it("trimestre e ano anterior", () => {
    expect(resolverAtalhoComparacao({ inicio: "2026-11-01", fim: "2026-11-30" }, "trimestre-anterior")).toEqual({
      inicio: "2026-08-01",
      fim: "2026-08-31",
    });
    expect(resolverAtalhoComparacao({ inicio: "2026-11-01", fim: "2026-11-06" }, "ano-anterior")).toEqual({
      inicio: "2025-11-01",
      fim: "2025-11-06",
    });
  });

  it("ano anterior de 29/02 cai em 28/02", () => {
    expect(resolverAtalhoComparacao({ inicio: "2024-02-29", fim: "2024-02-29" }, "ano-anterior")).toEqual({
      inicio: "2023-02-28",
      fim: "2023-02-28",
    });
  });

  it("periodoComparacao usa o período personalizado como está", () => {
    const periodo = { inicio: "2026-11-01", fim: "2026-11-30" };
    const escolhido = { inicio: "2026-01-05", fim: "2026-01-10" };
    expect(periodoComparacao(periodo, { tipo: "personalizado", periodo: escolhido })).toEqual(escolhido);
    expect(periodoComparacao(periodo, { tipo: "mes-anterior" })).toEqual({ inicio: "2026-10-01", fim: "2026-10-31" });
  });
});
