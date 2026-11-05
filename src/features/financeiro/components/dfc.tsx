"use client";

import Icon from "@mdi/react";
import {
  mdiArrowBottomRight,
  mdiArrowTopRight,
  mdiChartBar,
  mdiDatabaseClockOutline,
  mdiDatabaseOutline,
  mdiSafe,
  mdiTableLarge,
} from "@mdi/js";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { ABAS_FINANCEIRO, AbasModulo } from "@/components/abas-modulo";
import { useAvisos } from "@/components/avisos";
import { FiliaisSelect } from "@/components/filtros/filiais-select";
import { KpiCard, SemDados } from "@/components/kpi/kpi-card";
import { NaoIntegrado } from "@/components/nao-integrado";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Coluna } from "@/components/ui/data-table";
import { Field } from "@/components/ui/field";
import { ResizableRow } from "@/components/ui/resizable-row";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { filiaisQuery } from "@/lib/api";
import { mesesDoPeriodo } from "@/lib/date";
import { formatMesAno } from "@/lib/format";

/**
 * DFC (método direto) sem dados até existir fonte de caixa (D41, P51): a tela
 * mostra a estrutura do print e, em cada bloco, qual dado falta. A versão
 * estimada pela DRE mostrava o lucro do mês com outro nome e foi retirada.
 */

type Comparacao = "mes-anterior" | "ano-anterior";
const COMPARACOES: { value: Comparacao; label: string }[] = [
  { value: "mes-anterior", label: "Mês anterior" },
  { value: "ano-anterior", label: "Mesmo mês do ano anterior" },
];

const AGUARDANDO = "Aguardando dados de caixa";

// Classes completas (o Tailwind não gera classes montadas dinamicamente).
const ATIVIDADES = [
  {
    id: "operacional",
    label: "1. Fluxo de Caixa das Atividades Operacionais",
    cor: "bg-summary-green-bg",
    grupos: [
      {
        label: "Entradas operacionais",
        linhas: [
          ["Recebimentos de vendas (dinheiro e Pix)", "Vendas por forma de pagamento (P44)"],
          ["Recebimentos de cartões", "Liquidação dos cartões (P43)"],
          ["Recebimentos de clientes (títulos)", "Baixas das contas a receber (P47)"],
        ],
      },
      {
        label: "Saídas operacionais",
        linhas: [
          ["Pagamentos a fornecedores (mercadorias)", "Baixas das contas a pagar (P47)"],
          ["Despesas com pessoal", "Plano de contas dos pagamentos (P45)"],
          ["Despesas operacionais (energia, água, manutenção…)", "Plano de contas dos pagamentos (P45)"],
          ["Impostos e taxas", "Plano de contas dos pagamentos (P45)"],
        ],
      },
    ],
  },
  {
    id: "investimento",
    label: "2. Fluxo de Caixa das Atividades de Investimento",
    cor: "bg-summary-blue-bg",
    grupos: [
      {
        label: null,
        linhas: [
          ["Aquisição de imobilizado (equipamentos, reformas)", "Plano de contas dos pagamentos (P45)"],
          ["Aquisição de veículos", "Plano de contas dos pagamentos (P45)"],
        ],
      },
    ],
  },
  {
    id: "financiamento",
    label: "3. Fluxo de Caixa das Atividades de Financiamento",
    cor: "bg-summary-purple-bg",
    grupos: [
      {
        label: null,
        linhas: [
          ["Captação de empréstimos", "Movimento bancário (P42)"],
          ["Amortização de empréstimos (principal)", "Movimento bancário (P42)"],
          ["Pagamento de juros", "Movimento bancário (P42)"],
        ],
      },
    ],
  },
] as const;

const TOTAIS = [
  ["Geração Líquida de Caixa (1 + 2 + 3)", "Todas as fontes acima"],
  ["Saldo Inicial de Caixa e Equivalentes", "Saldos das contas e caixas (P42)"],
  ["Saldo Final de Caixa e Equivalentes", "Saldos das contas e caixas (P42)"],
] as const;

const vazio = <span className="text-muted-foreground">—</span>;

type LinhaDfc =
  | { tipo: "atividade"; chave: string; label: string; cor: string }
  | { tipo: "grupo"; chave: string; label: string }
  | { tipo: "linha"; chave: string; label: string; fonte: string }
  | { tipo: "total"; chave: string; label: string; fonte: string };

const LINHAS_DFC: LinhaDfc[] = ATIVIDADES.flatMap((a) => [
  { tipo: "atividade" as const, chave: a.id, label: a.label, cor: a.cor },
  ...a.grupos.flatMap((g) => [
    ...(g.label ? [{ tipo: "grupo" as const, chave: `${a.id}-${g.label}`, label: g.label }] : []),
    ...g.linhas.map(([label, fonte]) => ({ tipo: "linha" as const, chave: `${a.id}-${label}`, label, fonte })),
  ]),
]);

const LINHAS_TOTAIS: LinhaDfc[] = TOTAIS.map(([label, fonte]) => ({ tipo: "total", chave: label, label, fonte }));

function colunasDfc(mes: string, mesComparacao: string): Coluna<LinhaDfc>[] {
  const valor = (l: LinhaDfc) => (l.tipo === "grupo" ? null : vazio);
  return [
    {
      id: "categoria",
      titulo: "Categoria",
      align: "left",
      className: "max-w-72 truncate",
      cell: (l) => (
        <span className={l.tipo === "linha" ? "pl-4" : ""} title={l.label}>
          {l.label}
        </span>
      ),
    },
    { id: "mes", titulo: formatMesAno(mes), cell: valor },
    { id: "comparacao", titulo: formatMesAno(mesComparacao), cell: valor },
    {
      id: "fonte",
      titulo: "Dado necessário",
      align: "left",
      className: "text-xs font-normal text-muted-foreground",
      cell: (l) => (l.tipo === "linha" || l.tipo === "total" ? l.fonte : null),
    },
  ];
}

function DfcTabela({ mes, mesComparacao }: { mes: string; mesComparacao: string }) {
  return (
    <Card className="h-full min-w-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon path={mdiTableLarge} size={0.9} className="text-primary" aria-hidden />
          DFC Gerencial
        </CardTitle>
        <span className="flex items-center gap-1.5 rounded-md bg-summary-orange-bg px-2 py-1 text-xs font-medium text-warning">
          <Icon path={mdiDatabaseClockOutline} size={0.6} aria-hidden />
          {AGUARDANDO} (P51)
        </span>
      </CardHeader>
      <div className="relative flex min-h-0 flex-1 flex-col px-3 pb-3 pt-2">
        <div className="min-h-0 flex-1 overflow-auto rounded-xl border">
          <DataTable
            colunas={colunasDfc(mes, mesComparacao)}
            linhas={LINHAS_DFC}
            chave={(l) => l.chave}
            total={LINHAS_TOTAIS}
            classeLinha={(l) => (l.tipo === "atividade" ? `font-semibold ${l.cor}` : "")}
            linhaInteira={(l) =>
              l.tipo === "grupo" ? (
                <span className="block py-1 pl-4 pr-2.5 text-xs font-semibold text-muted-foreground">{l.label}</span>
              ) : null
            }
          />
        </div>
      </div>
    </Card>
  );
}

function CardVazio({
  titulo,
  aviso,
  detalhe,
  className = "",
}: {
  titulo: string;
  aviso: string;
  detalhe: string;
  className?: string;
}) {
  return (
    <Card className={`min-w-0 ${className}`}>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
      </CardHeader>
      <div className="min-h-36 flex-1">
        <NaoIntegrado titulo={aviso} detalhe={detalhe} />
      </div>
    </Card>
  );
}

export function Dfc() {
  const filiais = useQuery(filiaisQuery());
  const [mesEscolhido, setMes] = useState<string | null>(null);
  const [comparacao, setComparacao] = useState<Comparacao>("mes-anterior");
  const [filiaisEscolhidas, setFiliais] = useState<number[] | null>(null);
  const listasRef = useRef<HTMLDivElement>(null);

  const dados = filiais.data;
  const meses =
    dados?.dataMinima && dados.dataMaxima ? mesesDoPeriodo({ inicio: dados.dataMinima, fim: dados.dataMaxima }) : [];
  const mes = mesEscolhido ?? meses.at(-1) ?? "";
  const [a, m] = mes ? mes.split("-").map(Number) : [0, 0];
  const mesComparacao = mes
    ? new Date(Date.UTC(a, m - 1 - (comparacao === "mes-anterior" ? 1 : 12), 1)).toISOString().slice(0, 7)
    : "";

  useAvisos("dfc", [
    {
      id: "dfc-sem-dados",
      nivel: "atencao",
      titulo: "DFC aguardando dados de caixa",
      detalhes: [
        "A DFC precisa dos recebimentos e pagamentos efetivos, que ainda não estão no banco do SGBI.",
        "Faltam: movimento bancário e saldos, baixas dos títulos, liquidação dos cartões, vendas por forma de pagamento e plano de contas dos pagamentos (pendência P51).",
      ],
    },
  ]);

  const cabecalho = (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            Financeiro <span className="text-base font-medium text-muted-foreground">· DFC</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            {mes
              ? `Demonstração dos Fluxos de Caixa · ${formatMesAno(mes)} vs ${formatMesAno(mesComparacao)}`
              : "Demonstração dos Fluxos de Caixa"}
          </p>
        </div>
        <AbasModulo abas={ABAS_FINANCEIRO} label="Telas do Financeiro" />
      </div>
      {dados && mes ? (
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Período">
            <Select
              aria-label="Mês"
              className="w-36"
              value={mes}
              options={[...meses].reverse().map((x) => ({ value: x, label: formatMesAno(x) }))}
              onValueChange={setMes}
            />
          </Field>
          <Field label="Comparar com">
            <Select
              aria-label="Comparar com"
              className="w-52"
              value={comparacao}
              options={COMPARACOES}
              onValueChange={setComparacao}
            />
          </Field>
          <Field label="Filial">
            <FiliaisSelect
              filiais={dados.filiais}
              value={filiaisEscolhidas ?? dados.filiais.map((f) => f.codigo)}
              onChange={setFiliais}
            />
          </Field>
        </div>
      ) : (
        <div className="flex h-14 items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-5 text-primary" />
          Carregando filtros…
        </div>
      )}
    </div>
  );

  return (
    <div className="mx-auto flex w-full max-w-[1920px] flex-col gap-2.5">
      {cabecalho}

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          titulo="Saldo Inicial de Caixa"
          ajuda="Saldo de caixa e equivalentes no início do mês. Depende dos saldos das contas e caixas (P42)."
          icone={mdiDatabaseOutline}
          tom="blue"
          valor={<SemDados>Saldos bancários não integrados</SemDados>}
        />
        <KpiCard
          titulo="Entradas de Caixa"
          ajuda="Recebimentos efetivos do mês: vendas à vista, cartões liquidados e títulos recebidos (P43, P44, P47)."
          icone={mdiArrowTopRight}
          tom="green"
          valor={<SemDados>{AGUARDANDO}</SemDados>}
        />
        <KpiCard
          titulo="Saídas de Caixa"
          ajuda="Pagamentos efetivos do mês: fornecedores, pessoal, despesas, impostos, investimentos e empréstimos (P45, P47)."
          icone={mdiArrowBottomRight}
          tom="coral"
          valor={<SemDados>{AGUARDANDO}</SemDados>}
        />
        <KpiCard
          titulo="Geração Líquida de Caixa"
          ajuda="Entradas menos saídas das três atividades. Depende das fontes de entradas e saídas (P51)."
          icone={mdiChartBar}
          tom="teal"
          valor={<SemDados>{AGUARDANDO}</SemDados>}
        />
        <KpiCard
          titulo="Saldo Final de Caixa"
          ajuda="Saldo inicial + geração líquida (P42)."
          icone={mdiSafe}
          tom="purple"
          valor={<SemDados>Saldos bancários não integrados</SemDados>}
        />
      </div>

      <ResizableRow
        storageKey="sgbi:dfc:linha-principal"
        larguraInicial={58}
        abaixo={listasRef}
        alturaMinima={300}
        esquerda={<DfcTabela mes={mes || "2000-01"} mesComparacao={mesComparacao || "2000-01"} />}
        direita={
          <div className="flex h-full min-h-0 flex-col gap-2.5">
            <CardVazio
              titulo="Evolução da Geração de Caixa · 12 meses"
              aviso={AGUARDANDO}
              detalhe="Entradas, saídas e geração líquida por mês dependem dos recebimentos e pagamentos efetivos (P51)."
            />
            <CardVazio
              className="flex-1"
              titulo="Composição das Entradas e Saídas"
              aviso={AGUARDANDO}
              detalhe="A composição por forma de recebimento e por categoria de pagamento depende das vendas por forma de pagamento (P44) e do plano de contas dos pagamentos (P45)."
            />
          </div>
        }
      />

      <div ref={listasRef} className="grid grid-cols-1 gap-2.5 xl:grid-cols-[2fr_3fr]">
        <CardVazio
          titulo="Saldo por Conta Financeira"
          aviso="Contas financeiras não integradas"
          detalhe="O banco do SGBI não tem contas bancárias, caixas nem saldos (P42)."
        />
        <CardVazio
          titulo="Movimentações Relevantes do Período"
          aviso={AGUARDANDO}
          detalhe="As maiores entradas e saídas do mês, por conta financeira, dependem do movimento bancário e das baixas dos títulos (P42, P47)."
        />
      </div>
    </div>
  );
}
