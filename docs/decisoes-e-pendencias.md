# Decisões e pontos de alinhamento em aberto

Registro das decisões já tomadas no SGBI v2 e das perguntas que ainda precisam de resposta. Quando uma pergunta for respondida, preencha a **Resposta** e a data, aplique a mudança e mova o item para a lista de decisões.

Os detalhes técnicos e de dados de cada ponto estão em [`painel-executivo-poc.md`](painel-executivo-poc.md), [`vendas.md`](vendas.md), [`metas.md`](metas.md) e [`api-externa-mapeamento.md`](api-externa-mapeamento.md).

---

## 1. Decisões tomadas

### Negócio e dados

| # | Decisão | Data |
|---|---|---|
| D1 | **Situação e Alertas** ficam em um arquivo de configuração (`src/features/painel-executivo/config.ts`), com valores provisórios até a área de negócio definir os limites (ver P1 e P2) | 30/10/2026 |
| D2 | **Filtro Origem** com três opções: PDV + Faturamento, só PDV e só Faturamento. Os KPIs de base PDV (Ticket Médio, Cancelamentos, Descontos) ignoram o filtro e mostram a marca "PDV" | 30/10/2026 |
| D3 | **Venda bruta** (card Descontos) = venda + descontos | 30/10/2026 |
| D4 | **Metas e despesas** serão populadas pela qualidade em homologação. Até lá, os cards mostram "sem dados no período" | 30/10/2026 |
| D5 | **Descontos**: cálculo adiado por causa do tempo da consulta no `logpdv` (cerca de 34 s por mês). O card mostra "Em definição" (ver P3) | 30/10/2026 |
| D6 | Fonte da verdade é o **banco e o código** do BI antigo; o dicionário `message.json` é só apoio | 30/10/2026 |
| D7 | A POC usa só **dias fechados** (D-1). Os dados do dia, via API do VX, ficam fora da POC (ver P9) | 30/10/2026 |
| D18 | **Vendas: cupons, ticket médio e itens por cupom vêm do `logpdv`**, que bate centavo a centavo com a venda PDV da analise gerencial (o `parfil` tem cerca de metade, ver P6). Ignoram o filtro Origem e mostram a marca "PDV" | 04/11/2026 |
| D19 | **Vendas: Curva ABC** calculada no servidor, por faturamento (venda) e por rentabilidade (lucro bruto), com faixas provisórias A = 70% e B = 20% em `src/features/vendas/config.ts` (ver P24). Produtos com valor zero ou negativo ficam na C | 04/11/2026 |
| D20 | **Vendas: listas de produtos** usam a classe ABC por faturamento: queda e crescimento só da classe A (e só produtos com venda no período de comparação); maior e menor margem das classes A e B. O card mostra os primeiros e "Ver todos" abre os 50 primeiros, com exportação CSV (ver P26) | 04/11/2026 |
| D21 | **Vendas: cupons por departamento** = cupons com ao menos um item do departamento. A soma das linhas passa do total (um cupom conta em cada departamento); o total da tabela usa os cupons distintos do período (ver P27) | 04/11/2026 |
| D26 | **Metas: data de referência ("hoje")** = último dia com venda dentro do mês escolhido. O "dados até" de todas as telas passou a ser o último dia **com venda**: em homologação, 15/09/2026 tem só 145 linhas com venda zerada (carga parcial) e distorcia o "dia" e o atalho "Mês da última carga" | 04/11/2026 |
| D27 | **Metas: cálculos** — a meta é sempre do período inteiro; Atingimento = realizado ÷ meta do período; Diferença = realizado − meta (negativa = quanto falta); Situação pelo **ritmo** (realizado ÷ meta esperada até a referência, limites em `src/features/metas/config.ts`, ver P32); Projeção mantém o ritmo sobre a curva da meta (P35) | 04/11/2026 |
| D28 | **Metas por departamento, grupo e subgrupo** só existem por mês (`previsao_departamento/grupo/subgrupo`); para Dia, Semana e Quinzena a meta mensal é distribuída pela curva da meta diária da loja (`previsao_dia`). O filtro Departamento usa a meta do departamento distribuída da mesma forma (ver P33) | 04/11/2026 |
| D29 | **Meta de margem** = `previsao_lucro` ÷ `previsao_venda` do nível (ver P38) | 04/11/2026 |
| D30 | Metas com código que não existe no cadastro aparecem como "Código N (sem cadastro)", em vez de sumirem (ver P36) | 04/11/2026 |

### Interface

| # | Decisão | Data |
|---|---|---|
| D8 | **Visual do BI antigo** (azul `#4B8CFF`, cards arredondados, fonte Inter), com fundo liso no lugar do padrão de linhas e **tema escuro** novo no v2. Os prints de referência definem quais dados aparecem, não o visual | 30/10/2026 |
| D9 | **Layout compacto** (pedido do coordenador): os clientes preferem ver tudo sem rolar. Barra lateral fina (48px) que expande por cima do conteúdo, no lugar da barra superior; KPIs em grade 5 × 2; tabela e alertas em uma linha redimensionável. Os filtros mantêm o tamanho | 30/10/2026 |
| D10 | **Comparar com** é um calendário próprio, com os dias do Período em laranja e atalhos que recuam a partir dele (mesmo período anterior, semana, mês, trimestre e ano anterior). Atalho acompanha o Período; datas escolhidas à mão ficam fixas | 30/10/2026 |
| D11 | **Carregamento por card**: cada card mostra o próprio indicador e carrega de forma independente, sem bloquear a tela inteira | até 04/11/2026 |
| D12 | **Sem controles nativos do navegador** nos filtros; atalhos de data só preenchem o calendário e são aplicados no botão Aplicar | até 04/11/2026 |
| D13 | Todos os valores com **2 casas decimais** (moeda, %, p.p.); só os eixos dos gráficos usam formato compacto ("R$ 255 mil") | até 04/11/2026 |
| D14 | **Avisos** (dados incompletos, erros de carregamento) ficam em um popup aberto pelo triângulo da barra lateral, e não em faixas no topo da tela | 04/11/2026 |
| D22 | **Tela de Vendas**: mesmos filtros e barra lateral do Painel Executivo (o menu superior do print não foi adotado, ver D9). A linha da tabela ocupa o resto da tela sem esconder as listas de produtos; em telas baixas (< 900px) as listas mostram 4 produtos, e as colunas Código e Departamento só aparecem quando o card é largo (o nome completo fica no texto ao passar o mouse). Cabe sem rolar em 1536 × 864 e 1920 × 1080; em 1366 × 768 a página rola um pouco | 04/11/2026 |
| D23 | **Vendas: cupons carregam depois**: a consulta no `logpdv` leva de 13 a 17 s por período (ver P23), então é separada da venda. Os cards de cupons e as colunas de cupons da tabela mostram o próprio carregamento; o resto da tela não espera | 04/11/2026 |
| D24 | **Exportar** gera CSV no formato do Excel em português (";", vírgula decimal), com as linhas expandidas da tabela (ver P31) | 04/11/2026 |
| D31 | **Tela de Metas**: mesmas convenções das outras telas. Filtros: Mês de referência (meses com venda e meses com meta; os sem meta aparecem como "sem meta"), Filial, Departamento e Origem. Abas Dia, Semana, 1ª e 2ª Quinzena, Mês e Ano, relativas à referência; gráficos, tabela e cards seguem a aba escolhida. Cabe sem rolar em 1536 × 864 (tabela com altura mínima, ver P40) e 1920 × 1080 | 04/11/2026 |

### Projeto

| # | Decisão | Data |
|---|---|---|
| D15 | Stack obrigatória: Drizzle ORM, TanStack React Query, Recharts e Material Design Icons, sobre Next.js 16 | 30/10/2026 |
| D16 | Commits no **padrão do SGBI antigo**, com Ordem de Serviço (OS atual: 1649584) | 04/11/2026 |
| D17 | Repositório provisório em conta pessoal; se o projeto for aprovado, vai para a organização da empresa (ver P22) | 04/11/2026 |
| D25 | Código comum às telas fica fora das features: filtros, cards de KPI e gráfico de evolução em `src/components/`; datas, formatação, cálculos, tipos dos filtros e chamadas da API em `src/lib/`; validação de parâmetros e filiais em `src/server/` (rota `/api/filiais` compartilhada) | 04/11/2026 |

---

## 2. Pontos em aberto

Legenda de responsável sugerido: **Negócio** (área de negócio / produto), **Coordenação**, **Qualidade**, **VX** (equipe do VX / headquarter), **Infra**.

### Regras de negócio do Painel Executivo

**P1. Limites da Situação (Bom / Atenção / Crítico)** — Negócio
A coluna Situação não existe no BI antigo. Hoje ela usa a variação da compra sobre venda contra o período de comparação: até 2 p.p. = Bom; até 6 p.p. = Atenção; acima disso = Crítico.
- Quais limites usar?
- A variação conta nos dois sentidos? Hoje uma **queda** de 7 p.p. (compra menor em relação à venda) também aparece como Crítico.
- Os limites são iguais para todos os departamentos ou cada um tem o seu?

> Resposta: _em aberto_

**P2. Limites dos Alertas** — Negócio
Valores provisórios: departamento em Crítico; margem bruta caindo 0,5 p.p. ou mais; despesas sobre a venda subindo 0,5 p.p. ou mais; cancelamentos subindo 10% ou mais; descontos subindo 5% ou mais.
- Esses alertas e limites fazem sentido? Faltou algum?
- Os limites devem ser configuráveis por cliente (tela de configurações) ou fixos?

> Resposta: _em aberto_

**P3. Cálculo dos Descontos** — Coordenação / Infra
A soma de `logpdv.valorDesconto` leva cerca de 34 s por mês. Opções: índice de cobertura no `logpdv`, tabela diária pré-agregada pelo headquarter ou outra fonte já consolidada.
- Qual caminho seguir? Se for tabela nova, quem cria a carga?

> Resposta: _em aberto_

**P4. Fonte das metas** — Negócio / Qualidade
Existem `previsao_dia`, `previsao_filial` e `previsao_departamento`. A POC usa `previsao_dia.previsao_venda`.
- Qual tabela é a referência para "Venda vs Meta"?
- Quando a qualidade vai popular metas e despesas no período com vendas (2026)?

> Resposta: _em aberto_

**P5. Despesas sem tipo** — Negócio
Cerca de 14% das despesas em homologação não têm tipo. Hoje entram no total.
- Devem entrar no total? Precisam aparecer separadas?

> Resposta: _em aberto_

**P6. Ticket Médio e venda não batem** — VX
Em julho/2026, a filial 1 soma R$ 2,32 milhões na analise gerencial e R$ 1,10 milhão no `parfil`, com faturamento zerado. A filial 3 só existe no `parfil`; a filial 11 aparece na analise com venda zero.
**Achado de 04/11/2026:** o `logpdv` bate exatamente com a analise gerencial (filial 1 em 02/07/2026: R$ 82.244,09 nos dois, 1.315 cupons), enquanto o `parfil` tem R$ 40.956,60 e 702 cupons. Por isso a tela de Vendas usa o `logpdv` (D18), e o **Ticket Médio difere entre as telas**: R$ 53,93 no Painel Executivo (`parfil`) e R$ 56,42 em Vendas (`logpdv`), em julho/2026.
- Qual é a causa da diferença? Qual base é a correta para cada indicador?
- O Painel Executivo deve passar a usar o `logpdv` também (exige resolver P23)?

> Resposta: _em aberto_

**P7. Período e comparação padrão** — Negócio
Em homologação a tela abre em julho/2026 (último mês completo). Em produção, a proposta é abrir no mês atual até ontem, comparando com o mesmo período anterior.
- Qual período abrir por padrão? Comparar com o período anterior ou com o mesmo período do ano anterior?

> Resposta: _em aberto_

**P8. Origem padrão por usuário** — Negócio
O login do VX devolve `pegarVendas` (PDV, Faturamento ou ambos), que o BI antigo nunca usou.
- O filtro Origem deve abrir no valor do usuário?

> Resposta: _em aberto_

**P9. Dados do dia atual** — Coordenação
A API do VX tem venda, custo e cupons de hoje, mas não compras, despesas, cancelamentos, descontos nem metas.
- O painel deve incluir o dia de hoje quando o período chegar até ele? Como mostrar que parte dos indicadores não inclui hoje?
- Atualização automática (o BI antigo usa o parâmetro `ATUALIZAR_PAINEL_AUTOMATICAMENTE`) deve existir no v2?

> Resposta: _em aberto_

**P10. Detalhamento da tabela** — Negócio
A tabela troca entre Departamento, Grupo e Subgrupo pelas abas, mas não expande um departamento nos seus grupos.
- O detalhamento em árvore (departamento → grupo → subgrupo) é necessário?

> Resposta: _em aberto_

**P11. Nomes dos níveis mercadológicos** — Negócio
O login do VX informa o nome de cada nível no cliente (`departamentalizacao`). A POC usa fixo "Departamento / Grupo / Subgrupo".
- Usar os nomes do cliente? Mostrar mais de 3 níveis quando o cliente tiver?

> Resposta: _em aberto_

**P12. Lista de filiais** — Negócio / VX
Hoje a lista vem das filiais com movimento na analise gerencial (a filial 3, que só existe no `parfil`, não aparece).
- Mostrar todas as cadastradas, só as com movimento ou só as permitidas ao usuário (`filiaisComPermissao`)?
- A filial 3 também tem meta em homologação: sem ela na lista, a meta da loja na tela de Metas fica menor que a soma das filiais (P36).

> Resposta: _em aberto_

### Tela de Vendas

**P23. Desempenho das consultas no `logpdv`** — Coordenação / VX / Infra
Cupons e itens por dia levam cerca de 13 s por mês de dados (todas as filiais), e cupons por departamento, grupo ou subgrupo cerca de 16 s; a tela consulta o período atual e o de comparação. Há cache no servidor por algumas horas, mas a primeira consulta de cada filtro é lenta. Opções: tabela diária pré-agregada pelo headquarter (cupons e itens por filial, dia e nível), índice de cobertura no `logpdv` ou outra fonte já consolidada.
- Qual caminho seguir? Quem cria e mantém a carga?

> Resposta: _em aberto_

**P24. Faixas da Curva ABC** — Negócio
Provisório: A até 70% do acumulado, B até 90% e C o restante. No BI antigo as faixas vêm do login do VX (`curvaABC`, por cliente) e podem ter uma classe D.
- Usar as faixas do cliente (login do VX)? Ter classe D?
- Na rentabilidade, produtos com lucro negativo devem ficar na C (como hoje) ou numa lista à parte?

> Resposta: _em aberto_

**P25. Definição de "Itens por Cupom"** — Negócio
Hoje é a quantidade vendida dividida pelos cupons (unidades e kg somados), como a "cesta média" do BI antigo: 7,67 em julho/2026. A alternativa é contar itens registrados (linhas do cupom), que não mistura kg com unidades.
- Qual definição usar?

> Resposta: _em aberto_

**P26. Critérios das listas de produtos** — Negócio
- Crescimento e queda são ordenados pela variação %; produtos com venda anterior muito baixa aparecem no topo (ex.: +31.560% em julho/2026). Exigir uma venda mínima no período de comparação? Ordenar pela diferença em R$?
- As listas usam a classe por faturamento. Devem seguir o critério escolhido no card ABC (faturamento ou rentabilidade)?
- Itens que não são mercadoria (ex.: "TAXA ENTREGA", departamento DESPESAS) entram na menor margem. Devem ser excluídos? Quais departamentos?
- Quantos produtos mostrar em "Ver todos" (hoje 50)?

> Resposta: _em aberto_

**P27. Cupons por departamento** — Negócio
Hoje um cupom conta em cada departamento de que comprou (D21), então a soma das linhas passa do total.
- É essa a leitura esperada? Ou a coluna deveria mostrar outra medida (ex.: participação nos cupons)?

> Resposta: _em aberto_

**P28. Seletor do gráfico "Evolução da Margem Bruta"** — Negócio
No print o card tem um seletor "Filial", sem explicação. Hoje ele tem o agrupamento (diário, semanal, mensal), igual ao de "Evolução das Vendas".
- O seletor deveria abrir uma série por filial? Ou comparar filiais?

> Resposta: _em aberto_

**P29. Botão "Filtros" do print** — Negócio
O print tem um botão "Filtros" além de Período, Comparar com e Filial. Hoje a tela tem os mesmos filtros do Painel Executivo, incluindo a Origem (PDV/Faturamento).
- Quais filtros extras são esperados (ex.: departamento, comprador, fornecedor, marca)?

> Resposta: _em aberto_

**P30. Gráfico "Vendas por Departamento"** — Negócio
Mostra os 7 maiores departamentos e junta o resto em "Outros", com seletor Venda ou Lucro bruto. O seletor do print diz "Valor (R$)".
- Que outras medidas o seletor deve ter (ex.: quantidade, margem)? Quantos departamentos mostrar?

> Resposta: _em aberto_

**P31. Formato da exportação** — Negócio
Hoje exporta CSV (abre no Excel). O BI antigo tem exportação em PDF em alguns relatórios.
- CSV basta ou precisa de XLSX/PDF com cabeçalho e filtros aplicados?

> Resposta: _em aberto_

### Tela de Metas

**P32. Limites da situação (ritmo e margem)** — Negócio
Provisório (`src/features/metas/config.ts`): realizado ÷ meta esperada até a referência ≥ 100% = Acima; ≥ 95% = No ritmo; abaixo disso = Abaixo. Margem: até 0,5 p.p. abaixo da meta = Ok; até 2 p.p. = Atenção; mais que isso = Crítico. Os valores do print não seguem uma regra única (ex.: margem 21,8% contra meta 22,0% = Ok, mas 23,5% contra 24,0% = Atenção).
- Quais limites usar? Os mesmos para todos os departamentos?

> Resposta: _em aberto_

**P33. Meta diária por departamento, grupo e subgrupo** — Negócio / VX
O VX só grava meta mensal por nível; a meta diária existe só para a loja. Hoje a meta mensal do nível é distribuída nos dias pela curva da meta diária da loja (dias de maior venda pesam mais); sem meta diária da loja, por dias corridos.
- Essa distribuição é aceitável? Ou o VX deveria gerar meta diária por nível?

> Resposta: _em aberto_

**P34. Comparação dos cards ("vs")** — Negócio
O print mostra "vs R$ 30.000 (seg)" sem explicar a base. Hoje: Dia e Semana comparam com a semana anterior (mesmo dia da semana), Quinzenas e Mês com o mês anterior, Ano com o ano anterior; o realizado é comparado até o mesmo ponto do período.
- É essa a comparação esperada? Usar o filtro "Comparar com" das outras telas?

> Resposta: _em aberto_

**P35. Cálculo da projeção** — Negócio
Hoje: realizado ÷ meta esperada até a referência × meta do período (mantém o ritmo sobre a curva da meta). Sem meta: média diária do realizado × dias do período.
- Confirmar a fórmula. Considerar dias da semana ou feriados?

> Resposta: _em aberto_

**P36. Metas de homologação inconsistentes** — Qualidade / VX
- Só existem metas de abril e maio/2025, e a venda começa em 26/08/2025: nenhum mês tem meta e venda ao mesmo tempo.
- Os códigos de departamento das metas (1 a 24, 99, 999) não existem no cadastro (70 a 86); nenhum dos 101 grupos com meta existe na `view_11_grupos`; só 449 de 989 subgrupos casam.
- `previsao_lucro` é maior que `previsao_venda` em algumas filiais (ex.: filial 3) e é 8% em outras; `dias_uteis` varia entre filiais no mesmo mês.
- A filial 3 tem meta, mas não tem venda na analise gerencial, então fica fora da lista de filiais (ver P12).
- Pedido: popular metas de 2026 com os códigos do cadastro atual, para validar a tela.

> Resposta: _em aberto_

**P37. Departamentos em risco e com melhor desempenho** — Negócio
Hoje: em risco = situação Abaixo, do pior ritmo para o melhor; melhor desempenho = Acima ou No ritmo, do melhor para o pior; o card mostra 3 e "Ver todos" mostra o resto.
- O critério deve ser o ritmo, o atingimento do período ou a diferença em R$? Quantos mostrar?

> Resposta: _em aberto_

**P38. Significado de `previsao_lucro`** — VX
Hoje a meta de margem é `previsao_lucro` ÷ `previsao_venda`, supondo que `previsao_lucro` seja o lucro bruto esperado em R$. Os dados de homologação dão margens entre 8% e mais de 100%.
- `previsao_lucro` é lucro em R$, margem em % ou outra coisa?

> Resposta: _em aberto_

**P39. Data de referência e filtro de período** — Negócio
O print tem um filtro "Período" (01/10 a 31/10, "Mês atual") e a aba Dia diz "Hoje". Como os dados são D-1, a tela usa um seletor de mês, e o "dia" é o último dia com venda do mês.
- O usuário precisa escolher outro dia de referência (ex.: ver como estava a meta no dia 10)?
- Quando houver dados do dia (API do VX, P9), a aba Dia deve mostrar hoje?

> Resposta: _em aberto_

**P40. Densidade em 1536 × 864** — Coordenação
Para caber sem rolar, a tabela de acompanhamento abre com a altura mínima (uma ou duas linhas visíveis; o usuário pode aumentar, e o tamanho fica salvo). Em 1920 × 1080 aparecem cerca de 8 linhas.
- Prioridade em telas menores: tabela maior (rolando a página) ou todos os blocos visíveis? Alguns cards de baixo poderiam virar abas?

> Resposta: _em aberto_

**P41. Seletores dos gráficos e botão "Filtros"** — Negócio
No print, o gráfico de cumprimento tem um seletor "Mês" e o de departamentos um seletor "Dia"; hoje os dois seguem a aba de período escolhida. O botão "Filtros" do print também não está claro (ver P29).
- O gráfico de cumprimento deve ter uma visão anual (mês a mês)? O de departamentos precisa de período próprio?

> Resposta: _em aberto_

### Acesso, segurança e integração

**P13. Login e permissões** — Coordenação
O BI antigo usa o login do VX e a tabela local `users` (relatórios liberados por usuário). A POC não tem login.
- O v2 mantém o mesmo modelo? Quando entra o login?

> Resposta: _em aberto_

**P14. Token da API do VX** — VX
Em homologação a API responde sem `Authorization`, inclusive `/sgbi/usuarios` (nomes e logins de funcionários).
- Em produção o token é obrigatório? Onde ele fica guardado no v2?

> Resposta: _em aberto_

**P15. Falha de segurança no BI antigo** — Coordenação
A rota `/api/check` do BI antigo devolve o token da API para qualquer um, sem login.
- Vai ser corrigida no BI antigo? (O v2 não repete o problema.)

> Resposta: _em aberto_

**P16. LGPD** — Negócio
O login devolve `lgpdClientesCamposProtegidos` (campos de cliente a ocultar), que o BI antigo ignora.
- O v2 deve aplicar essa regra nas telas que mostrarem dados de clientes?

> Resposta: _em aberto_

**P17. Bloqueio por sistema** — Negócio
O BI antigo bloqueia painéis conforme o `sistema` do cliente.
- A regra continua? Quais telas são bloqueadas para quais sistemas?

> Resposta: _em aberto_

### Ambiente e entrega

**P18. Dados de teste em homologação** — Qualidade
Faltam: metas e despesas em 2026, vendas no "dia atual" do VX de homologação e os dias sem carga na analise gerencial (14–23/08 e 25–30/08/2026).
- Quem lança e para quando?

> Resposta: _em aberto_

**P19. Deploy** — Infra
O build não acessa o banco, pensando em imagem Docker.
- Onde o v2 roda (mesmo servidor do BI antigo, por cliente, nuvem)? Como as variáveis de ambiente chegam em cada cliente?
- Convive com o BI antigo durante a migração? Em qual endereço?

> Resposta: _em aberto_

**P20. Uso do banco** — Infra / VX
A POC só lê o MySQL do BI antigo.
- O v2 vai precisar gravar (configurações, permissões, preferências)? No mesmo banco ou em outro?
- Há previsão de sair do MySQL 5.7?

> Resposta: _em aberto_

**P21. Ordem de migração das telas** — Coordenação
- Depois do Painel Executivo, quais relatórios do BI antigo entram primeiro?

> Resposta: _em aberto_

**P22. Repositório definitivo** — Coordenação
- Se aprovado, qual organização e nome do repositório? Precisa de CI (lint, build) e de proteção da branch principal?

> Resposta: _em aberto_
