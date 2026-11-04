# Decisões e pontos de alinhamento em aberto

Registro das decisões já tomadas no SGBI v2 e das perguntas que ainda precisam de resposta. Quando uma pergunta for respondida, preencha a **Resposta** e a data, aplique a mudança e mova o item para a lista de decisões.

Os detalhes técnicos e de dados de cada ponto estão em [`painel-executivo-poc.md`](painel-executivo-poc.md) e [`api-externa-mapeamento.md`](api-externa-mapeamento.md).

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

### Projeto

| # | Decisão | Data |
|---|---|---|
| D15 | Stack obrigatória: Drizzle ORM, TanStack React Query, Recharts e Material Design Icons, sobre Next.js 16 | 30/10/2026 |
| D16 | Commits no **padrão do SGBI antigo**, com Ordem de Serviço (OS atual: 1649584) | 04/11/2026 |
| D17 | Repositório provisório em conta pessoal; se o projeto for aprovado, vai para a organização da empresa (ver P22) | 04/11/2026 |

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
- Qual é a causa da diferença? Qual base é a correta para cada indicador?

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
