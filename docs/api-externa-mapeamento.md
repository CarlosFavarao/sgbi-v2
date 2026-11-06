# Mapeamento da API externa (VX) no SGBI antigo

Levantamento feito em 30/10/2026 a partir do código do BI antigo (`../sgbi`, v3.3.1), do README e da coleção do Postman "API SG - Interno" (pasta **SG BI**).

## 1. Fontes de dados do BI antigo

| Fonte | O que traz | Atualização |
|---|---|---|
| MySQL local (`sgbi_*`) | Tudo que é histórico: vendas, custos, compras, despesas, DRE, metas, cadastros | Carga noturna do "headquarter" (lê os `.dbf` do VX) → **dados até ontem** |
| `API_VIEW` (API REST do VX/harbour) | **Vendas do dia atual**, finalizadoras, login, usuários e status do VX | Tempo real |
| SGPS (`http://sgps.sgsistemas.com.br/SGPSWeb`) | Telemetria de uso (`POST /SGBI/index.php`). **Desativada**: a chamada em `useAnalytics` está comentada | — |
| Repositório SG (`http://repo.sgsistemas.com.br:8080`) | Envio da versão do SGBI/VX do cliente após o login (só em produção) | — |
| `API_AI_CHAT` | Chats de IA (fora do escopo do v2) | — |

## 2. Cliente HTTP da API_VIEW

- Base: `${API_VIEW}/sgsistemas/v1/sgbi` (`src/services/httpBack.ts`, `externalHttp`). A rota de status fica fora do `/sgbi`: `${API_VIEW}/sgsistemas/v1/status`.
- Autenticação: o interceptor `AuthTokenInterceptor` envia `Authorization: <token>`, lido da tabela `tokens` do MySQL. A coleção do Postman não documenta autenticação.
- Todas as chamadas partem do **servidor** (Route Handlers); o navegador nunca fala com a API_VIEW.
- Formato padrão das listas: `{ dados: [...], paginacao: { pagina, itensPorPagina, quantidadePaginas, quantidadeItens, ordenacao: { por, direcao } } }`.
- Parâmetros comuns: `filiais` (lista separada por vírgula), `por` (campo de ordenação, ex.: `totalValorVendas`, `totalQuantidade`, `id`), `direcao` (`asc`/`desc`), `itensPorPagina`, `pagina`.
- Regras do VX citadas no Postman: vendas canceladas não entram; nas finalizadoras, origens inválidas são ignoradas e o troco é descontado.

## 3. Rotas externas usadas pelo BI antigo

### 3.1 Dados de vendas

| Rota externa (`/sgbi/...`) | Parâmetros | Campos devolvidos | Rota interna do BI antigo | Tela que usa | Período |
|---|---|---|---|---|---|
| `GET /online/resumido/vendas/filiais` | `por`, `direcao` (não filtra por filial; o BI filtra depois) | `id` (filial), `descricao`, `totalValorVendas`, `totalQuantidade` (**cupons**), `totalQuantidadeItens`, `totalCusto` | `/api/painel/online/resumo/hoje/vendas` e `/api/painel/online/resumo/hoje/vendas/percentual` | Painel: **Resumo de Vendas (Dia)** e **Total por Loja** | Só hoje |
| `GET /online/resumido/vendas/finalizadoras` | `filiais`, `por`, `direcao` | `id`/`descricao` (finalizadora: DINHEIRO, CARTAO DEB...), `totalValorVendas`, `totalQuantidade` (cupons) | `/api/painel/online/resumo/hoje/vendas/finalizadoras` | Painel: **Finalizadoras (Dia)**. Se a API responder 403, cai para a rota consolidada com o mês atual | Só hoje |
| `GET /consolidado/resumido/vendas/finalizadoras` | `filiais`, `dataInicial`, `dataFinal` (+ `por`, `direcao`, paginação) | Mesmos campos da rota online | `/api/painel/online/resumo/mes/vendas/finalizadoras` | Painel: **Finalizadoras (Mês)** | Período informado |
| `GET /online/resumido/vendas/produtos` | `filiais`, `por` (`totalValorVendas` ou `totalQuantidade`), `direcao`, `itensPorPagina` (top, padrão 10), `pagina` | `id` (produto), `descricao`, `totalValorVendas`, `totalQuantidade` | `/api/painel/online/resumo/hoje/vendas/ranking` | Painel: **Ranking de Produtos (Dia)**, por valor e por quantidade. O ranking do mês vem do MySQL | Só hoje |
| `GET /online/resumido/vendas/produtos/rentabilidade` | `filial` (**uma por chamada**), `origem` (`TODOS`/`PDV`/`FATURAMENTO`, não documentado no Postman), `por`, `direcao`, `itensPorPagina`, `pagina` | `id`, `descricao`, `totalValorVendas`, `totalQuantidade`, `totalValorCusto`, `totalValorLucro`, `lucroSobreVenda`, `lucroSobreCusto` | `/api/vendas/vendas-diarias` (chama uma vez por filial e soma no servidor) | Relatório **Análise de Vendas (Diário)** | Só hoje |

**Finalizadoras só existem na API**, inclusive o histórico: o MySQL não tem uma tabela de vendas por finalizadora (`cartoes_vendas` cobre apenas cartões).

### 3.2 Usuários, login e status

| Rota externa | Uso no BI antigo |
|---|---|
| `POST /sgbi/login` — corpo `{ "usuario", "senha" }` | Login (`/api/auth/login`). O VX valida a senha; o cliente precisa ter os produtos SG View e SGBI |
| `GET /sgbi/usuarios` | Lista de usuários do VX (`login`, `nome`, `filiais`) para a tela **Configurações → Permissões de Usuário** (`/api/users`, `/api/users/sgvx`). Remove o login `SUPORTE` e duplicados |
| `GET /status` (fora de `/sgbi`) | Versão e cliente do VX (`versao`, `revisao`, `dataSistema`, `cnpjFilialBase`, `codigoCliente`, `nomeFantasia`...). Usado em `/api/status` (tela de login e chat de IA, via `useCompanyInfo`) e no envio de versão ao repositório SG após o login (só em produção) |

Campos que o **login do VX** devolve e o BI usa durante a sessão:

| Campo | Para quê | Usado no BI antigo? |
|---|---|---|
| `login`, `nome`, `admin` | Identidade; `admin` = usuário suporte, vê todos os relatórios | Sim |
| `filiaisComPermissao` (`codigo`, `apelido`) | **Filiais que o usuário pode ver** | Sim |
| `niveisDepartamentalizacao`, `departamentalizacao` (`nivel1`...`nivel6`) | Quantidade de níveis mercadológicos e o **nome de cada nível** no cliente | Sim |
| `curvaABC` (`A`, `B`, `C`, `D` em %) | Faixas da Curva ABC | Sim |
| `assistenteIaAjuda`, `assistenteIaConsultor` | Liberam os chats de IA | Sim |
| `sistema` | Plataforma do cliente (`SGVX`, `CLOUD`, `FIVEWIN`): bloqueia painéis no Fivewin (`isPanelBlocked`). No v2 define as fontes de dados disponíveis e desabilita os cards sem dado (D46, P61) | Sim |
| `pegarVendas`, `descricaoPegarVendas` (ex.: `T` = "ambas as tabelas") | Origem padrão das vendas (PDV, Faturamento ou ambas) | **Não**: o código tem um "tratar salesOrigin" pendente e sempre usa `TODOS` |
| `lgpdClientesCamposProtegidos` | Campos de cliente a ocultar (CPF, endereço, telefone...) | **Não** |
| `email`, `grupo`, `nivel`, `senha` (hash) | — | Não |

Regra do login antigo: um usuário que não é admin precisa existir na tabela local `users` com pelo menos um relatório liberado; senão recebe 403, mesmo com a senha correta.

**No v2 (D45):** o login usa o mesmo `POST /sgbi/login` (`src/server/login.ts`, pelo cliente `src/server/vx.ts`) e o `GET /status` na tela de login. A regra dos relatórios liberados e as filiais do usuário ainda não são aplicadas (P59): a sessão guarda só `login`, `nome` e `admin`. O envio da versão ao repositório SG não foi levado (P60). Como no BI antigo, sem token na tabela `tokens` o usuário e a senha vão em maiúsculas; com token, o usuário vai em minúsculas e a senha como digitada.

## 4. Rotas documentadas no Postman e não usadas pelo BI antigo

| Rota | Observação |
|---|---|
| `GET /sgbi/online/resumido/vendas/nivel1` ... `nivel6` | Venda de hoje por nível mercadológico (`id`, `descricao`, `totalValorVendas`, `totalQuantidade`). No exemplo de cliente, nível 3 = departamento. Útil para "hoje" na tabela por departamento (sem compras). No Postman, o exemplo do nível 5 aponta para a URL do `nivel4` (erro da documentação) |
| `GET /sgbi/consolidado/detalhado/vendas/cartoes` | Vendas de cartão por filial, PDV e parcela (`filiais`, `dataInicial`, `dataFinal`, paginação). O BI usa a tabela `cartoes_vendas` do MySQL no lugar |

## 5. Como o painel antigo combina API e MySQL

O card **Resumo de Vendas** (`OnlineSalesService.findDailyIndicators`) mistura as duas fontes:

| Bloco | Fonte |
|---|---|
| Hoje: venda, cupons, itens, custo, ticket médio, cesta média | API (`online/.../filiais`) |
| Ontem | MySQL (`parfil`) |
| Mês até agora | MySQL: venda e custo da analise gerencial; cupons e itens do `parfil`. **Não inclui hoje** |
| Últimos 30 dias e os 30 anteriores | MySQL (`parfil`) |

O painel atualiza sozinho pelo parâmetro `ATUALIZAR_PAINEL_AUTOMATICAMENTE` (tabela `parameters`, minutos), aplicado como `refetchInterval` no React Query.

## 6. Teste em homologação (30/10/2026, só GET e sem token)

| Rota | Resultado |
|---|---|
| `GET /status` | 200 — cliente "SUPERMERCADO ALVORADA", `dataSistema` 06/10/2026 |
| `GET /sgbi/online/resumido/vendas/{filiais,finalizadoras,produtos,produtos/rentabilidade,nivel3}` | 200 com `dados: []`: o VX de homologação não tem vendas no "dia atual" dele |
| `GET /sgbi/consolidado/resumido/vendas/finalizadoras` (outubro/2026, filial 1) | 200 com dados |
| `GET /sgbi/usuarios` | 200 com a lista de usuários |

Achados:

1. **Não dá para testar os dados de hoje em homologação** enquanto o VX de lá não tiver vendas no dia. É preciso pedir para a qualidade lançar vendas de teste, ou testar num ambiente com movimento.
2. **A API de homologação responde sem o header `Authorization`** (a tabela `tokens` está vazia). Isso inclui `/sgbi/usuarios`, que devolve nome e login de funcionários. Vale confirmar com a equipe do VX se em produção o token é obrigatório.
3. **O BI antigo expõe o token da API**: a rota `/api/check` devolve o conteúdo da tabela `tokens` para qualquer um, sem login. O v2 não deve repetir isso.

## 7. Impacto no v2 (Painel Executivo)

O que dá para trazer "de hoje" pela API, se o período filtrado incluir o dia atual:

| KPI do painel | Hoje via API? | Rota |
|---|---|---|
| Venda, Lucro Bruto, Margem | Sim (venda e custo) | `online/.../filiais` |
| Ticket Médio | Sim (venda ÷ cupons) | `online/.../filiais` |
| Venda por departamento | Sim, só venda | `online/.../nivel3` |
| Compra sobre Venda, Despesas, Resultado, Cancelamentos, Descontos, Meta | **Não**: só no MySQL (D-1) | — |

Pontos de atenção para a integração:

- A rota por filial não filtra por `filiais`; é preciso filtrar no servidor.
- A rentabilidade por produto aceita **uma filial por chamada**.
- Origem PDV/Faturamento hoje: só a rota de rentabilidade aceita `origem`; as demais devolvem o total.
- O token da tabela `tokens` deve ficar só no servidor, nunca em resposta de API.
- O `pegarVendas` do login pode virar o **valor padrão do filtro Origem** por usuário (o BI antigo nunca implementou isso).
- As permissões de filial (`filiaisComPermissao`) do login devem limitar o filtro de filiais e as consultas no servidor.
