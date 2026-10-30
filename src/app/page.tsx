import { ThemeToggle } from "@/components/theme-toggle";

// Provisional page to validate the light/dark themes.
// It will be replaced by the Painel Executivo (docs/painel-executivo-poc.md).
const summaryPairs = [
  ["Venda", "bg-summary-green-bg", "text-summary-green-icon"],
  ["Lucro", "bg-summary-gold-bg", "text-summary-gold-icon"],
  ["Margem", "bg-summary-pink-bg", "text-summary-pink-icon"],
  ["Despesas", "bg-summary-blue-bg", "text-summary-blue-icon"],
  ["Ticket", "bg-summary-purple-bg", "text-summary-purple-icon"],
  ["Compras", "bg-summary-teal-bg", "text-summary-teal-icon"],
  ["Cancelamentos", "bg-summary-coral-bg", "text-summary-coral-icon"],
  ["Descontos", "bg-summary-orange-bg", "text-summary-orange-icon"],
] as const;

const charts = [
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
  "bg-chart-6",
  "bg-chart-7",
  "bg-chart-8",
];

export default function Home() {
  return (
    <>
      <header className="sticky top-0 z-30 h-15 bg-header text-header-foreground shadow-lg">
        <div className="mx-auto flex h-full max-w-[2400px] items-center px-3 lg:px-5">
          <span className="text-xl font-medium">SGBI</span>
          <div className="ml-auto text-header-foreground [&_button]:text-header-foreground [&_button:hover]:bg-white/15">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="organic-lines-bg flex-1 p-4">
        <div className="mx-auto grid max-w-screen-2xl gap-6">
          <section className="rounded-2xl border bg-card p-6 text-card-foreground shadow-md">
            <h1 className="text-2xl font-semibold leading-none">Painel Executivo</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Página provisória para validar os temas claro e escuro.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-8">
              {summaryPairs.map(([label, bg, icon]) => (
                <div key={label} className={`rounded-xl p-4 ${bg}`}>
                  <div className={`text-sm font-semibold ${icon}`}>{label}</div>
                  <div className="mt-1 text-lg font-semibold">R$ 0,00</div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
              <span className="rounded-md bg-positive-highlight px-2 py-1 font-medium text-success">
                ▲ 8,2% Bom
              </span>
              <span className="rounded-md bg-summary-orange-bg px-2 py-1 font-medium text-warning">
                Atenção
              </span>
              <span className="rounded-md bg-negative-highlight px-2 py-1 font-medium text-error">
                ▼ 6,2% Crítico
              </span>
              <span className="font-medium text-info">Info</span>
              <button
                type="button"
                className="ml-auto rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-accent"
              >
                Filtros
              </button>
            </div>

            <div className="mt-6 flex gap-2">
              {charts.map((c) => (
                <div key={c} className={`h-8 flex-1 rounded-md ${c}`} />
              ))}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
