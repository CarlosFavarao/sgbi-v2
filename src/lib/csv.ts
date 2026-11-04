// Exportação de tabelas em CSV no formato do Excel em português
// (separador ";", vírgula decimal e BOM para manter os acentos).

type Celula = string | number | null | undefined;

const numero = new Intl.NumberFormat("pt-BR", { useGrouping: false, maximumFractionDigits: 2 });

function celula(valor: Celula): string {
  if (valor == null || (typeof valor === "number" && !Number.isFinite(valor))) return "";
  const texto = typeof valor === "number" ? numero.format(valor) : valor;
  return /[;"\n]/.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto;
}

/** Gera o CSV e dispara o download no navegador. */
export function baixarCsv(nomeArquivo: string, cabecalho: string[], linhas: Celula[][]) {
  const conteudo = [cabecalho, ...linhas].map((l) => l.map(celula).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿", conteudo], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);
}
