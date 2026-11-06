# Tela de Metas

Terceira tela do v2 (`/metas`), feita a partir de um print de referência que define **quais dados** a tela mostra. O visual segue o padrão das outras telas. As decisões estão em [`decisoes-e-pendencias.md`](decisoes-e-pendencias.md) (D26 a D31) e as perguntas em aberto em P32 a P41.

## 1. De onde vêm as metas

| Tabela | Granularidade | Uso |
|---|---|---|
| `previsao_dia` | Filial × dia (`ano`, `mes`, `codigo_dia`) | Meta diária da loja: KPIs, abas, curva do gráfico e distribuição das metas de nível |
| `previsao_filial` | Filial × mês | Não usada (soma igual à da `previsao_dia` em homologação) |
| `previsao_departamento` / `_grupo` / `_subgrupo` | Nível × filial × mês | Meta da tabela, do gráfico por departamento e do filtro Departamento |

Campos usados: `previsao_venda` (meta de venda) e `previsao_lucro` (base da meta de margem, P38). `dias_uteis`, `codigo_vendedor`, `codigo_produto` e `previsao_cobertura_clientes` não são usados.

O realizado vem da analise gerencial (venda e custo, conforme a Origem), como nas outras telas. O BI antigo faz o mesmo em `MetasRealizadoRepository.ts`.

## 2. Regras

- **Referência ("hoje")**: último dia com venda dentro do mês escolhido (D26).
- **Abas**: Dia (a referência), Semana (segunda a domingo), 1ª Quinzena (1 a 15), 2ª Quinzena (16 ao fim), Mês e Ano. Uma aba que ainda não começou fica "Aguardando".
- **Meta do período**: soma da meta diária no período inteiro. Para departamento, grupo e subgrupo (só há meta mensal), a meta mensal é dividida igualmente pelos dias do mês, como no BI antigo (D28, P33).
- **Meta esperada (ritmo)**: soma da meta diária do início do período até a referência.
- **Atingimento** = realizado ÷ meta do período. **Diferença** = realizado − meta. **Situação** pelo ritmo (realizado ÷ meta esperada): Acima, No ritmo ou Abaixo (limites em `config.ts`, P32).
- **Projeção** = realizado ÷ meta esperada × meta do período; sem meta, média diária × dias do período (P35).
- **Comparação ("vs")**: Dia e Semana contra a semana anterior; Quinzenas e Mês contra o mês anterior; Ano contra o ano anterior (P34).
- **Margem**: meta de margem = `previsao_lucro` ÷ `previsao_venda`; margem atual = (venda − custo) ÷ venda; situação Ok, Atenção ou Crítico pela diferença em p.p. (P32).

## 3. Dados de homologação

Os dados de metas de homologação não permitem validar a tela com meta e venda juntas (P36):

- Há metas só para abril e maio de 2025; a venda começa em 26/08/2025. Em abril/2025 a tela mostra metas com realizado zerado (e avisa); em 2026 mostra o realizado e a projeção pela média, com "Sem meta cadastrada".
- Os códigos de departamento e grupo das metas não existem no cadastro (parecem de outro cliente): aparecem como "Código N (sem cadastro)".
- A filial 3 tem meta, mas não tem venda, então fica fora da lista de filiais.

## 4. Implementação

Estrutura em `src/features/metas/`:

| Arquivo | Papel |
|---|---|
| `server/data.ts` | Queries Drizzle (server-only) com `'use cache'`, `cacheLife('hours')` e tag `metas` |
| `metas.ts` | Soma da meta diária e divisão da meta mensal de nível pelos dias (funções puras, usadas no servidor) |
| `periodos.ts` | Data de referência e as seis abas (período inteiro, parte decorrida e comparação) |
| `compute.ts` | Resumo de meta (atingimento, diferença, situação, projeção, margem) e curva de cumprimento |
| `config.ts` | Limites de ritmo e margem, linhas dos cards |
| `src/app/api/metas/{opcoes,metas-diarias,realizado-diario,total,niveis}` | Route Handlers |
| `components/` | Filtros, abas, KPIs, gráfico de cumprimento, atingimento por departamento, tabela e cards de baixo |

Consultas (todas com cache no servidor):

| Rota | O que traz | Tempo medido |
|---|---|---|
| `/opcoes` | Meses com meta e departamentos | < 0,1 s |
| `/metas-diarias` | Meta diária no ano da referência (e no período de comparação) | < 0,1 s |
| `/realizado-diario` | Venda e custo por dia, do início da semana ou do mês até a referência | cerca de 1 s |
| `/total` | Venda e custo somados (aba Ano e comparação) | 3 a 4 s para o ano |
| `/niveis` | Meta distribuída, realizado e comparação por nível na aba | cerca de 1 s (mês) |

Limitações conhecidas:

- A semana que começa no ano anterior não soma a meta dos dias do ano anterior (a meta diária é carregada só do ano da referência).
- Sem dados do dia (API do VX): a aba Dia mostra o último dia com venda.

## Layout personalizável (D43)

A tela usa a grade personalizável, como o Painel Executivo (ver `docs/painel-executivo-poc.md`, seção 9): o lápis ao lado dos filtros liga a edição (arrastar, trocar de lugar, redimensionar pelas bordas e cantos, ocultar, restaurar o padrão). O layout padrão e os limites de cada card ficam em `src/features/metas/layout.ts`.
