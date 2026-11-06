# Decisões cruciais do SGBI v2

Resumo dos pontos que mais pesam no resultado das telas, tirados de [`decisoes-e-pendencias.md`](decisoes-e-pendencias.md) (onde estão todos os detalhes, com as respostas a preencher). Cada item diz **o que a tela faz hoje**, **por que isso importa** e **o que precisa ser respondido**. Os códigos `D#` e `P#` apontam para o documento completo.

Posição em 05/11/2026. Nenhuma das perguntas abaixo tem resposta ainda; tudo o que está em "hoje" é provisório.

## Resumo

| Tema | Itens | Mais urgente |
|---|---|---|
| 1. Dados que faltam | 7 | Fonte de caixa (P51, P42): sem ela a DFC fica vazia e o Fluxo de Caixa parte de zero |
| 2. Tratamento dos dados | 8 | Cartão contado pelo vencimento (P43) e meta diária dividida igualmente (P33) |
| 3. Legendas e situações | 6 | Limites e nomes de "Situação" (P1, P32, P46) e consistência de cores entre telas |

Regra que vale para tudo (decisão do usuário, 04/11/2026): **sem fonte confiável, a tela mostra vazio ou "não integrado" com a pendência indicada, nunca uma aproximação que pareça o dado real** (D34, D41).

---

## 1. Dados que faltam

### 1.1 Fonte de caixa: bloqueia a DFC (P51, P42, P44, P45)
- **Hoje:** a DFC (`/financeiro/dfc`) mantém o layout do print, mas todos os valores ficam vazios, e cada linha diz o dado que falta (D41). No Fluxo de Caixa, "Saldo em Caixa", "Dias de Cobertura" e "Saldo por Conta" aparecem como "não integrado".
- **Por que importa:** o banco do SGBI não tem contas bancárias, saldos, vendas por finalizadora (dinheiro, Pix) nem plano de contas dos pagamentos. A primeira versão da DFC, feita pela DRE, mostrava o lucro do mês com outro nome (R$ 302.672 contra lucro líquido de R$ 287.310 em jul/2026) e foi retirada.
- **Precisa de resposta:** quem, na equipe de dados (VX / headquarter), entrega movimento bancário e saldos, baixas dos títulos, liquidação dos cartões, vendas por forma de pagamento e plano de contas dos pagamentos, e **em que prazo**.

### 1.2 "Saldo" que não é saldo (P42)
- **Hoje:** "Menor Saldo Projetado", o resultado acumulado do gráfico e a coluna "Acumulado" do fluxo previsto somam o fluxo **partindo de zero**.
- **Por que importa:** o nome sugere saldo bancário. O número é uma soma de movimentos e pode enganar a decisão.
- **Precisa de resposta:** trocar os nomes agora (ex.: "menor fluxo acumulado previsto") ou esperar o saldo bancário chegar.

### 1.3 Vendas à vista fora das entradas (P44)
- **Hoje:** as entradas do Fluxo de Caixa só têm cartões e contas a receber. Dinheiro, Pix e cheque só existem na API do VX, e as categorias "Vendas Dinheiro" e "Vendas Pix" do print não aparecem.
- **Precisa de resposta:** integrar a API no fluxo ou gravar as finalizadoras na carga noturna.

### 1.4 Metas e despesas não populadas (P4, P36, P18, P47)
- **Hoje:** só há meta de abril e maio de 2025 e a venda começa em agosto de 2025, então nenhum mês tem meta e venda juntas. Os códigos de departamento e grupo das metas não existem no cadastro ("Código N (sem cadastro)", D30). Há só 33 contas a pagar e 47 a receber, quase todas sem baixa.
- **Por que importa:** não dá para validar Metas e Financeiro com dados reais.
- **Precisa de resposta:** quem popula metas de 2026 com os códigos do cadastro atual e títulos com baixas coerentes, e para quando.

### 1.5 Descontos não calculados (P3, P23)
- **Hoje:** o card Descontos mostra "Em definição". A soma no `logpdv` leva cerca de 34 s por mês, e cupons por departamento levam de 13 a 17 s.
- **Precisa de resposta:** tabela diária pré-agregada pelo headquarter, índice de cobertura no `logpdv` ou outra fonte já consolidada, e quem cria e mantém a carga.

### 1.6 Dia atual (P9)
- **Hoje:** o banco tem dados até o dia anterior (D-1); o "dados até" é o último dia **com venda**. A API do VX tem venda, custo e cupons de hoje, mas não compras, despesas, cancelamentos, descontos nem metas.
- **Precisa de resposta:** incluir o dia de hoje quando o período chegar até ele? Como avisar que parte dos indicadores não o inclui?

---

### 1.7 Dados de cada plataforma: VX, Cloud e Fivewin (P61, D46)
- **Hoje:** cada card declara as fontes de dados que usa e fica desabilitado ("Indisponível no Fivewin") quando a plataforma do cliente não as envia ao banco do BI. A lista do que falta em cada plataforma é provisória: o Fivewin repete o BI antigo (sem financeiro, despesas, cartões, metas e compras) e o Cloud é tratado como o VX.
- **Por que importa:** com a lista errada, o cliente Cloud ou Fivewin vê zeros que parecem dado real, ou perde um card que funcionaria.
- **Precisa de resposta:** quais tabelas cada plataforma popula (documentação prevista); ajustar só `FONTES_AUSENTES` em `src/lib/acesso.ts`.

## 2. Tratamento dos dados

### 2.1 Qual base de venda e de cupons (P6, D18, D42)
- **Hoje:** cupons, Ticket Médio e itens por cupom vêm do `logpdv`, que bate centavo a centavo com a venda PDV da analise gerencial. O `parfil` tem cerca de metade da venda e não é mais usado. Painel e Vendas mostram o mesmo Ticket Médio (R$ 56,42 em jul/2026).
- **Precisa de resposta:** o VX confirma a causa da diferença do `parfil` e qual base é a correta para cada indicador.

### 2.2 Cartão entra pelo vencimento (P43)
- **Hoje:** o valor líquido do cartão conta como recebido no **vencimento** (data de liquidação prevista), e até a referência vale como recebido. A `data_baixa` está vazia em cerca de 32 mil das 69 mil parcelas.
- **Por que importa:** como o cartão é quase toda a entrada com volume, "Entradas do Período" é uma previsão de liquidação, não caixa recebido.
- **Precisa de resposta:** usar a data de baixa (conciliação) quando existir? Como tratar cartão vencido e não baixado?

### 2.3 Meta por departamento, grupo e subgrupo (D28, P33)
- **Hoje:** o VX grava meta **mensal** por nível; a meta diária existe só para a loja. A meta do Dia, da Semana e das Quinzenas por nível é a meta mensal **dividida igualmente pelos dias do mês**, como no BI antigo. Um sábado tem a mesma meta de uma terça. Aprovado como provisório.
- **Precisa de resposta:** o VX pode gerar meta diária por nível, ou a divisão deve seguir a curva da loja (dias fortes pesam mais)?

### 2.4 Cupons por departamento somam mais que o total (D21, P27)
- **Hoje:** um cupom conta em cada departamento de que tem item, então a soma das linhas passa do total. O total da tabela usa os cupons distintos do período.
- **Precisa de resposta:** é essa a leitura esperada?

### 2.5 Definições de indicadores
| Indicador | Definição de hoje | Pergunta |
|---|---|---|
| Itens por cupom (P25) | Quantidade vendida ÷ cupons (unidades e kg somados), como a "cesta média" do BI antigo | Contar itens registrados em vez disso? |
| Projeção (P35) | Realizado ÷ meta esperada até a referência × meta do período; sem meta, média diária × dias | Confirmar a fórmula; considerar dias da semana e feriados? |
| Meta de margem (D29, P38) | `previsao_lucro` ÷ `previsao_venda`, supondo lucro em R$ | O que é `previsao_lucro` de fato? Em homologação dá de 8% a mais de 100% |
| Comparação "vs" dos cards (P34) | Dia e Semana contra a semana anterior; Quinzenas e Mês contra o mês anterior; Ano contra o ano anterior | É a comparação esperada? |

### 2.6 Listas de produtos e Curva ABC (D19, D20, P24, P26)
- **Hoje:** faixas A 70% / B 20% / C 10% provisórias (no BI antigo vêm do login do VX, por cliente). Produto com valor zero ou negativo vai para a C. Queda e crescimento ordenam pela variação %, e um produto com venda anterior mínima aparece no topo (+31.560% em jul/2026). Itens que não são mercadoria ("TAXA ENTREGA", departamento DESPESAS) entram na menor margem.
- **Precisa de resposta:** usar as faixas do cliente? Exigir venda mínima na comparação? Excluir quais departamentos?

### 2.7 Registros sujos ou incompletos
- **Hoje:** datas `0000-00-00` valem como vazias (D33). Cerca de 14% das despesas não têm tipo e entram no total (P5). Dias sem carga na analise gerencial (14–23/08 e 25–30/08/2026) ficam sem ponto. A carga do último dia pode vir parcial, por isso o "dados até" é o último dia com venda (D26).
- **Precisa de resposta:** despesa sem tipo entra no total e aparece separada? Quem corrige as lacunas de carga (P18)?

### 2.8 Filtros que não valem para todos os indicadores (D2)
- **Hoje:** o filtro Origem (PDV, Faturamento, ambos) não vale para Ticket Médio, Cancelamentos e Descontos (base PDV); esses cards mostram a marca "PDV". As listas de filiais diferem entre as telas: a filial 3 só aparece na DRE e na meta (P12, P56).
- **Precisa de resposta:** lista única de filiais (cadastro ou permissões do usuário)? A Origem deve abrir no valor do usuário (P8)?

---

## 3. Legendas e situações (como "Situação" em Compra sobre Venda)

### 3.1 Situação do Compra sobre Venda não existe no BI antigo (D1, P1)
- **Hoje:** vem da **variação absoluta** em p.p. da compra sobre a venda contra o período de comparação: até 2 p.p. = Bom; até 6 p.p. = Atenção; acima disso = Crítico (`src/features/painel-executivo/config.ts`).
- **Por que importa:** como o valor é absoluto, uma **queda** de 7 p.p. (compra menor em relação à venda) também aparece como Crítico. Os limites são iguais para todos os departamentos.
- **Precisa de resposta:** quais limites? Contar nos dois sentidos ou só a alta? Limites por departamento?

### 3.2 Situação de Metas: ritmo e margem (D27, P32)
- **Hoje:** Atingimento: realizado ÷ meta esperada até a referência; a partir de 100% = Acima, de 95% = No ritmo, abaixo = Abaixo. Margem: até 0,5 p.p. abaixo da meta = Ok, até 2 p.p. = Atenção, mais que isso = Crítico (`src/features/metas/config.ts`). Os valores do print não seguem uma regra única (margem 21,8% contra meta 22,0% = Ok, mas 23,5% contra 24,0% = Atenção).
- **Precisa de resposta:** quais limites, e iguais para todos os departamentos? Qual critério para "em risco" e "melhor desempenho" (P37)?

### 3.3 Status do fluxo previsto e dos compromissos (P46)
- **Hoje:** dia com saídas maiores que entradas = Atenção; acumulado negativo = Crítico; o resto = Ok. Compromissos: Vencido ou A vencer.
- **Precisa de resposta:** regra confirmada? Usar um saldo mínimo de segurança?

### 3.4 Quando não há dado para classificar
- **Hoje, cada tela trata de um jeito:** Painel mostra "—" na Situação sem comparação; Metas mostra "Sem meta" (sem meta cadastrada) ou "Aguardando" (período que ainda não começou); a DFC e o Fluxo mostram "não integrado" / "aguardando dados".
- **Precisa de resposta:** padronizar os estados vazios com um vocabulário só e um visual só (hoje um selo cinza com texto, "—" ou bloco de aviso).

### 3.5 Cores e nomes diferentes para o mesmo conceito
- **Hoje:** as situações usam Bom / Atenção / Crítico (Painel), Ok / Atenção / Crítico (margem e fluxo) e Acima / No ritmo / Abaixo (atingimento). "Abaixo" é vermelho no selo da tabela, mas laranja nas barras de "Atingimento por Departamento". Na Curva ABC, A, B e C usam verde, laranja e vermelho, a mesma paleta de bom e ruim, embora a classe não seja um juízo de valor.
- **Precisa de resposta:** definir uma paleta e um vocabulário únicos para situação (e outra paleta, neutra, para classes e categorias). Posso aplicar assim que for decidido.

### 3.6 Como a legenda aparece nas tabelas (convenção nova, 05/11/2026)
- **Hoje:** em tabela com cabeçalho de dois níveis, uma coluna de situação tem "Situação" no nível 1 e, no nível 2, **três bolinhas** com as cores das situações possíveis (Bom, Atenção e Crítico no Painel; Ok, Atenção e Crítico na margem de Metas); o nome de cada uma aparece na dica da bolinha. A coluna "Atingimento → Situação" de Metas tem cinco estados (Acima, No ritmo, Abaixo, Aguardando, Sem meta) e mostra o texto no nível 2, sem bolinhas. "Sem meta" não aparece entre as bolinhas da margem.
- **Precisa de resposta:** a legenda deve listar também os estados vazios? Preferem texto no lugar das bolinhas em tabelas com poucos estados?

---

## Ordem sugerida para as respostas

1. **Equipe de dados:** fonte de caixa (1.1), vendas à vista (1.3) e metas e títulos de 2026 (1.4). Destravam DFC, Fluxo de Caixa e Metas.
2. **Negócio:** limites e vocabulário das situações (3.1 a 3.5), cartão pelo vencimento (2.2) e meta diária por nível (2.3). Mudam o que as telas dizem ao usuário.
3. **Coordenação e infra:** tabela pré-agregada de cupons e descontos (1.5), dia atual (1.6) e lista única de filiais (2.8).
