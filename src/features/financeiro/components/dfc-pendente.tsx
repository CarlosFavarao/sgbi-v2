import Icon from "@mdi/react";
import { mdiDatabaseClockOutline } from "@mdi/js";
import { ABAS_FINANCEIRO, AbasModulo } from "@/components/abas-modulo";
import { Card } from "@/components/ui/card";

const FONTES = [
  "Movimento bancário (entradas e saídas por conta) e saldos diários das contas e caixas",
  "Baixas dos títulos a pagar e a receber (data e valor efetivamente pagos/recebidos)",
  "Liquidação dos cartões (data e valor líquido creditado, com as taxas)",
  "Vendas por forma de pagamento (dinheiro, Pix, cartões, crediário)",
  "Plano de contas dos pagamentos (fornecedores, pessoal, impostos, investimentos, empréstimos)",
];

/**
 * DFC sem dados até existir fonte de caixa (P51): a versão estimada pela DRE
 * mostrava o lucro do mês com outro nome e foi retirada (D41).
 */
export function DfcPendente() {
  return (
    <div className="mx-auto flex w-full max-w-[1920px] flex-col gap-2.5">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            Financeiro <span className="text-base font-medium text-muted-foreground">· DFC</span>
          </h1>
          <p className="text-xs text-muted-foreground">Demonstração dos Fluxos de Caixa</p>
        </div>
        <AbasModulo abas={ABAS_FINANCEIRO} label="Telas do Financeiro" />
      </div>

      <Card className="mx-auto mt-6 w-full max-w-2xl items-center px-6 py-8 text-center">
        <Icon path={mdiDatabaseClockOutline} size={1.6} className="text-primary" aria-hidden />
        <h2 className="mt-2 text-lg font-semibold">Aguardando fonte de dados de caixa</h2>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          A DFC precisa dos recebimentos e pagamentos efetivos. O banco do SGBI ainda não tem esses dados, e a DRE
          (regime de competência) não serve como substituta: ela mostraria o lucro do mês, não o caixa. A tela volta a
          exibir valores quando estas fontes forem carregadas:
        </p>
        <ul className="mt-4 flex max-w-xl flex-col gap-1.5 text-left text-sm">
          {FONTES.map((fonte) => (
            <li key={fonte} className="flex gap-2">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
              {fonte}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">Pendência P51 em docs/decisoes-e-pendencias.md</p>
      </Card>
    </div>
  );
}
