# Progresso — GuinchoFin SaaS

Status do roadmap por fase. Atualizar ao final de cada fase.

## ✅ Fase 0 — Estrutura base

- Next.js (App Router, TS) + Tailwind v4 + shadcn/ui
- Supabase: clients browser/server, proxy de sessão (`proxy.ts`)
- Layout autenticado: sidebar + topbar, logout
- Login (`/login`) com `useActionState`
- Tema **light** como padrão (tokens `:root`), `.dark` mantido pra toggle futuro
- Fontes Manrope (sans) + JetBrains Mono (números)
- `.env.local` / `.env.example` configurados (Supabase)

## ✅ Fase 1 — Modelo de dados

- `supabase/migrations/0001_init.sql`: tabelas `empresas`, `usuarios`, `clientes`,
  `motoristas`, `veiculos_frota`, `viagens`, `lancamentos_financeiros`,
  `contas_a_receber`, `patio`, `alertas`
- Multi-tenant: `empresa_id` em todas as tabelas de negócio
- RLS via fn `empresa_atual()`, policies por empresa
- `supabase/seed.sql`: dados de exemplo (1 empresa, clientes, motoristas, veículos, viagens, lançamentos, contas, pátio, alerta)

**Pendente**: migration e seed ainda não aplicados no projeto Supabase remoto
(rodar manual via SQL Editor / `supabase db push`, sem acesso MCP). Vincular
usuário (`auth.users`) à empresa via `usuarios` após criar login.

## ✅ Fase 2 — Viagens + Ordem de Serviço

- `/viagens`: lista (cards mobile / tabela desktop), badges de status
- `/viagens/nova`: form criar (cliente, motorista, veículo, origem/destino,
  data, valor, status, observações)
- `/viagens/[id]`: detalhe (OS), troca de status, link editar, excluir
- `/viagens/[id]/editar`: form editar (reusa `ViagemForm`)
- Server actions em `app/(dashboard)/viagens/actions.ts`
- `lib/format.ts` (moeda/data pt-BR), `lib/types.ts` (status viagem)
- Sidebar: item "Viagens" liberado

## ✅ Fase 3 — Financeiro + Dashboard

- `/financeiro`: CRUD `lancamentos_financeiros` (receitas/despesas) e
  `contas_a_receber` (status pendente/pago/atrasado), em duas seções
- `/financeiro/lancamentos/novo` e `/financeiro/lancamentos/[id]/editar`
- `/financeiro/contas/nova` e `/financeiro/contas/[id]/editar`
- Server actions em `app/(dashboard)/financeiro/actions.ts`
- Dashboard (`/`) com KPIs reais: caixa do mês, a receber (pendente/atrasado),
  lucro do período (acumulado), viagens hoje
- `lib/parse.ts` (parseValor compartilhado), `lib/format.ts` (formatDateTime)
- Sidebar: item "Financeiro" liberado

## ✅ Fase 4 — Frota, Pátio e Alertas

- `/frota`: CRUD `veiculos_frota` (placa, modelo, ano, status)
- `/patio`: CRUD `patio` — entrada de veículo, registrar saída, histórico
- `/alertas`: central de alertas (marcar lido/não lido, marcar todos lidos,
  excluir)
- Sino de alertas no topbar (`AlertasBell`) com contagem de não lidos
- `components/shared/delete-button.tsx` (botão de exclusão reutilizável)
- Sidebar: itens "Frota" e "Pátio" liberados

## ✅ Fase 5 — WhatsApp (grupo) + IA

Integração via Evolution API com UM grupo de WhatsApp autorizado (não 1:1).
IA via adapter `AIProvider` (provider atual: Gemini, free tier).

### ✅ Sub-fase 5.1 — Migrations + RLS + Storage

- `supabase/migrations/0005_whatsapp_fase5.sql`:
  - `grupos_whatsapp` (empresa_id, grupo_jid único, nome, ativo) — deriva a
    empresa a partir do JID do grupo (`@g.us`).
  - `participantes_whatsapp` (empresa_id, participant_jid, usuario_id
    opcional, nome_exibicao) — mapeamento opcional autor→usuário.
  - `lancamentos_pendentes` (empresa_id, grupo_jid, participant, origem,
    payload jsonb, media_url, message_id, status, criado_em, expira_em) —
    rascunho de lançamento aguardando confirmação do participant. Index por
    `(empresa_id, grupo_jid, participant, status)`.
  - `whatsapp_mensagens_processadas` (message_id pk) — dedupe global do
    webhook, RLS sem policies (só service role).
  - `lancamentos_financeiros`: novas colunas `origem`
    (`manual|whatsapp_audio|whatsapp_foto|whatsapp_texto`, default
    `manual`) e `anexo_url`.
  - Bucket Storage `comprovantes` (privado) + policies em
    `storage.objects` isolando por `(storage.foldername(name))[1] =
    empresa_atual()`. Convenção de path: `{empresa_id}/...`.
  - Todas as tabelas novas seguem o padrão RLS `empresa_id = empresa_atual()`.
- `lib/types.ts`: `LancamentoOrigem` + `LancamentoFinanceiro.origem`/`anexo_url`.
- `.env.example`: `SUPABASE_SERVICE_ROLE_KEY`, `AI_PROVIDER` (default
  `gemini`), `GEMINI_API_KEY`, `EVOLUTION_WEBHOOK_SECRET`,
  `WHATSAPP_GRUPO_JID` (mantém `ANTHROPIC_API_KEY` reservado p/ futuro
  provider, não usado).

### ✅ aplicar `0005_whatsapp_fase5.sql` no Supabase remoto.

### ✅ Sub-fase 5.2 — interface AIProvider + provider Gemini

- `lib/ai/types.ts`: interface `AIProvider` (`transcreverAudio`,
  `lerComprovante`, `interpretarMensagem`), tipos `ComprovanteExtraido`,
  `MensagemInterpretada`, `IntencaoMensagem`, e `AIProviderError`.
- `lib/ai/gemini.ts`: `GeminiProvider` — usa a Gemini API (REST,
  `gemini-2.0-flash` por padrão, configurável via `GEMINI_MODEL`) em JSON
  mode (`responseMimeType: "application/json"`) para os 3 métodos. Parse
  seguro (valores/datas/categorias inválidos viram `null`; resposta
  malformada ou erro de rede lança `AIProviderError`, que o webhook (5.3/5.4)
  trata como "extração falhou, pedir valor manualmente").
- `lib/ai/index.ts`: `getAIProvider()` — fábrica baseada em `AI_PROVIDER`
  (default `"gemini"`). Adicionar um novo provider = criar a implementação
  de `AIProvider` e registrar o `case` aqui.
- `scripts/test-ai-provider.ts` + `npm run test:ai -- texto|comprovante|audio
  <arg>` — smoke test manual contra a Gemini API real (requer
  `GEMINI_API_KEY` em `.env.local`). Adicionado `tsx` como devDependency
  para rodar o script TS.

**Pendente**: usuário gerar `GEMINI_API_KEY` (free tier) e rodar `npm run
test:ai` p/ validar fim a fim.

### ✅ Sub-fase 5.3 — webhook (route handler) + roteamento por mídia

- `lib/supabase/service.ts`: `createServiceClient()` — client com
  `SUPABASE_SERVICE_ROLE_KEY`, bypassa RLS (uso só server-side/webhook).
- `lib/whatsapp/evolution.ts`: client da Evolution API —
  `enviarMensagemTexto(remoteJid, texto, mentionJid?)` (`POST
  /message/sendText/{instance}`), `baixarMidiaMensagem(messageKey)` (`POST
  /chat/getBase64FromMediaMessage/{instance}` → Buffer + mimeType),
  `numeroDoJid(jid)`.
- `lib/whatsapp/types.ts`: tipos do payload do webhook (`messages.upsert`)
  e `RascunhoPayload` (`{tipo, valor, categoria, data, descricao,
  estabelecimento?}`).
- `lib/whatsapp/normalizar.ts`: `normalizarComprovante` (foto → sempre
  despesa) e `normalizarMensagem` (áudio/texto → tipo vem da intenção da IA,
  ou forçado pelo comando `/gasto`/`/ganho`). Valida categoria contra
  `LANCAMENTO_CATEGORIAS`, arredonda valor (2 decimais), default `data` =
  hoje.
- `lib/whatsapp/processar.ts`: `processarWebhookEvolution(body)` —
  - ignora `fromMe`, chats fora de `@g.us`, e (se `WHATSAPP_GRUPO_JID`
    setado) qualquer grupo diferente dele;
  - dedupe via `whatsapp_mensagens_processadas` (insert; PK duplicada =
    já processado, aborta);
  - resolve `empresa_id` via `grupos_whatsapp` (grupo precisa existir e
    estar `ativo`; senão ignora silenciosamente);
  - roteia por `messageType`: `audioMessage` →
    `transcreverAudio`+`interpretarMensagem`; `imageMessage` →
    `lerComprovante`; `conversation`/`extendedTextMessage` → só processa
    se começar com `/gasto` ou `/ganho` (senão ignora, sem chamar IA);
  - baixa a mídia (áudio/foto) e sobe pro bucket `comprovantes` em
    `{empresa_id}/{uuid}.{ext}`;
  - cria `lancamentos_pendentes` (`status: 'pendente'` se valor > 0,
    senão `'erro'`) e responde no grupo mencionando `@participant`
    pedindo confirmação (*"Responda SIM..."*) ou pedindo o valor
    manualmente em caso de erro.
- `app/api/webhook/evolution/[secret]/route.ts`: `POST` — valida
  `secret` do path contra `EVOLUTION_WEBHOOK_SECRET` (Evolution API não
  assina o payload, então a autenticação é pelo segredo na própria URL do
  webhook), chama `processarWebhookEvolution`, sempre responde `200` (erros
  já tratados/logados, evita retries).
- `.env.example`: + `EVOLUTION_INSTANCE`, comentário do
  `EVOLUTION_WEBHOOK_SECRET` explicando o uso no path.

**Pendente**:
- configurar na Evolution API o webhook (evento `messages.upsert`) apontando
  para `https://<seu-dominio>/api/webhook/evolution/<EVOLUTION_WEBHOOK_SECRET>`;
- inserir manualmente uma linha em `grupos_whatsapp` (empresa_id, grupo_jid,
  ativo=true) — UI de cadastro vem na 5.5;
- ainda não há tratamento de "SIM"/correção/expiração (5.4) — por ora o
  rascunho fica em `lancamentos_pendentes` sem nunca virar
  `lancamentos_financeiros`.

### ✅ Sub-fase 5.4 — fluxo de confirmação (rascunho → SIM → grava)

- `lib/whatsapp/normalizar.ts`: `aplicarCorrecao(atual, correcao)` — mescla
  uma nova interpretação sobre o rascunho existente (só sobrescreve campos
  não-nulos; `tipo` muda só se a IA detectar `receita`/`despesa`
  explicitamente); `correcaoVazia(correcao)` — true se a IA não extraiu nada
  aproveitável.
- `lib/whatsapp/processar.ts`:
  - mensagens de texto sem comando agora buscam o rascunho pendente mais
    recente do `(empresa_id, grupo_jid, participant)` com status
    `pendente`/`erro` (`buscarRascunhoPendente`). Sem rascunho → ignora, sem
    chamar IA. Se o rascunho passou de `expira_em`, marca `expirado`
    lazily e trata como inexistente.
  - `processarRespostaRascunho`: regex rápido p/ confirmação
    (`sim|confirma|ok|...`) e cancelamento (`não|cancela|...`) — sem custo
    de IA. "SIM" com rascunho `pendente` → `salvarLancamento` (insere em
    `lancamentos_financeiros` com `origem`/`anexo_url` do rascunho, marca
    `lancamentos_pendentes.status = 'confirmado'`) e responde "Pronto!
    Lançamento salvo. ✅". "SIM" com rascunho `erro` → pede o valor antes de
    confirmar. Cancelamento → `status = 'expirado'` + "lançamento
    descartado".
  - qualquer outra resposta → `interpretarMensagem` + `aplicarCorrecao`,
    atualiza o rascunho (`pendente`/`erro` conforme valor) e reenvia a
    mensagem de confirmação/pedido de valor. Resposta sem nada aproveitável
    → pede SIM/NÃO/correção de novo.
  - extraído `mensagemRascunho()` — builder único da mensagem de
    confirmação/erro, reusado na criação e após correção.

**Importante**: "apenas o mesmo participant confirma seu próprio rascunho" é
garantido pela própria query (`(grupo_jid, participant)` é a chave de busca),
sem necessidade de lógica extra.

### ✅ Sub-fase 5.5 — UI de configuração e histórico + liberar sidebar

- `lib/types.ts`: `LANCAMENTO_ORIGEM_LABEL`, `RascunhoStatus` +
  `RASCUNHO_STATUS_LABEL`/`RASCUNHO_STATUS_BADGE_CLASS`, `GrupoWhatsapp`,
  `LancamentoPendentePayload`, `LancamentoPendente`.
- `app/(dashboard)/whatsapp/actions.ts`: `createGrupo` (valida sufixo
  `@g.us`, trata `23505` como "grupo já cadastrado"), `toggleGrupo`,
  `deleteGrupo` — todos com `revalidatePath("/whatsapp")`.
- `components/whatsapp/grupo-form.tsx` e
  `components/whatsapp/toggle-grupo-button.tsx`: formulário de vínculo de
  grupo (padrão `useActionState` + `useFormFeedback`) e botão
  ativar/desativar.
- `app/(dashboard)/whatsapp/page.tsx`:
  - Card "Status da integração": checagem server-side (sem expor segredos)
    de Evolution API, webhook, IA (Gemini) e grupo autorizado ativo.
  - Card "Grupos vinculados": lista `grupos_whatsapp` da empresa, com
    formulário de cadastro, toggle ativo/inativo e exclusão
    (`DeleteButton`).
  - Card "Histórico de mensagens processadas": últimos 30
    `lancamentos_pendentes` (data, origem, categoria, valor, status com
    badge).
- `components/layout/app-sidebar.tsx`: "WhatsApp" movido para `nav` e
  `availableRoutes`; grupo "Integrações" (que só tinha esse item, agora
  vazio) removido.

**Pendente**: nenhum item das sub-fases 5.1–5.5. Falta apenas o usuário
preencher `GEMINI_API_KEY` e as variáveis `EVOLUTION_*` no `.env.local` /
painel de produção, configurar a URL do webhook no Evolution
(`/api/webhook/evolution/<EVOLUTION_WEBHOOK_SECRET>`) e cadastrar o grupo
autorizado pela própria UI em `/whatsapp` (não precisa mais de SQL manual).

## ✅ Fase 6 — Roteirização e Automações

### ✅ Sub-fase 6.1 — Localidades (IBGE)

- `supabase/migrations/0002_localidades_viagem.sql`: colunas
  `origem_cidade/uf/ibge/lat/lon` e `destino_cidade/uf/ibge/lat/lon` em
  `viagens`; tabela `municipios_coords_fallback` (referência global, RLS
  select-only) p/ municípios sem coordenada no dataset estático.
- `scripts/fetch-municipios.mjs`: gera `public/ibge-municipios.json`
  (5.570 municípios — nome, UF, código IBGE, lat/lon) a partir do dataset
  estático `kelvins/municipios-brasileiros` (MIT). Servido como asset
  estático com `Cache-Control: immutable` (`next.config.ts`), buscado 1x
  pelo client e mantido em memória — sem chamadas por tecla.
- `lib/ibge.ts`: `getMunicipios()`, `findMunicipioPorIbge()`,
  `getCoordsComFallback()` (dataset local → cache `municipios_coords_fallback`
  → geocodifica via Nominatim/OSM como último recurso, com User-Agent
  próprio).
- `components/ui/combobox.tsx`: wrapper shadcn sobre `@base-ui/react/combobox`.
- `components/shared/municipio-autocomplete.tsx`: autocomplete de
  município (cidade - UF), grava `*_cidade/uf/ibge/lat/lon` em inputs hidden.
- `ViagemForm`: novos campos "Cidade de origem"/"Cidade de destino"
  (autocomplete IBGE) além dos campos de endereço livre existentes.
- `app/(dashboard)/viagens/actions.ts`: `buildPayload` agora assíncrono,
  persiste os 10 novos campos e usa `getCoordsComFallback` como rede de
  segurança se o autocomplete não enviar lat/lon.
- Seed atualizado com cidade/UF/IBGE/coords nas 3 viagens de exemplo.

### ✅ aplicar `0002_localidades_viagem.sql` no Supabase remoto.

### ✅ Sub-fase 6.2 — Serviço de rotas (RouteProvider + cache)

- `supabase/migrations/0003_rotas_cache.sql`: tabela `rotas_cache`
  (origem_ibge, destino_ibge, distancia_km, duracao_min, pedagio_estimado,
  fonte), RLS select/insert liberados (referência global, sem empresa_id).
- `lib/rotas.ts`: `getRota(origem, destino)` — cache em `rotas_cache`
  primeiro, depois calcula via OSRM (driving, `OSRM_BASE_URL` configurável,
  default demo público) e grava no cache. `pedagioEstimado` ainda fica
  `null` (sem fonte de dados de pedágio ainda).

**Pendente**: aplicar `0003_rotas_cache.sql` no Supabase remoto.

### ✅ Sub-fase 6.3 — Auto-preenchimento da viagem (km/pedágio/preço sugerido)

- `supabase/migrations/0004_viagem_rota_tarifa.sql`: colunas `distancia_km`
  e `pedagio_estimado` em `viagens`; coluna `tarifa_km_padrao` (default
  5.00) em `empresas`.
- `lib/types.ts`: `Viagem` ganha `distancia_km`/`pedagio_estimado`.
- `app/(dashboard)/viagens/actions.ts`: `buildPayload` calcula
  `distancia_km`/`pedagio_estimado` via `getRota` quando origem/destino têm
  IBGE+coords. Nova action `sugerirRota(origem, destino)` retorna
  km/duração/pedágio/preço sugerido (`distanciaKm * tarifa_km_padrao da
  empresa + pedagioEstimado`).
- `components/shared/municipio-autocomplete.tsx`: novo prop `onChange`.
- `ViagemForm`: ao selecionar origem+destino, busca sugestão via
  `sugerirRota` e mostra km/duração/pedágio + botão "Usar valor sugerido"
  que preenche o campo `valor`.
- `/viagens/[id]`: exibe distância e pedágio estimado quando presentes.

**Pendente**: aplicar `0004_viagem_rota_tarifa.sql` no Supabase remoto.

### ✅ Sub-fase 6.4 — Abastecimentos

- `supabase/migrations/0007_abastecimentos.sql`: tabela `abastecimentos`
  (empresa_id, veiculo_id, motorista_id opcionais com `on delete set null`,
  data, litros, valor_litro, valor_total, km_atual, posto, observacoes,
  lancamento_id). RLS `empresa_id = empresa_atual()`. `lancamentos_financeiros`
  ganha coluna `abastecimento_id` (`on delete set null`) e a origem
  `'abastecimento'` é adicionada ao check de `origem`.
- `lib/types.ts`: tipo `Abastecimento`, `LancamentoOrigem`/`LANCAMENTO_ORIGEM_LABEL`
  ganham `abastecimento`.
- `app/(dashboard)/abastecimentos/actions.ts`: `createAbastecimento` calcula
  `valor_litro = valor_total / litros` e cria automaticamente um
  `lancamentos_financeiros` (despesa, categoria "Combustível", origem
  `abastecimento`, descrição "Abastecimento - <placa> - <posto>"), vinculado
  via `lancamento_id`. `updateAbastecimento` atualiza o lançamento vinculado;
  `deleteAbastecimento` remove o lançamento vinculado junto.
- `/abastecimentos`: lista (cards mobile / tabela desktop) com
  data/veículo/motorista/litros/R$ por litro/total/km/posto.
- `/abastecimentos/novo` e `/abastecimentos/[id]/editar`:
  `AbastecimentoForm` (veículo, motorista opcional, data, litros, valor
  total, km atual opcional, posto opcional, observações).
- Sidebar: item "Abastecimentos" liberado.

**Pendente**: aplicar `0007_abastecimentos.sql` no Supabase remoto.

### ✅ Sub-fase 6.5 — Geração automática de alertas

- `supabase/migrations/0008_alertas_automaticos.sql`: `alertas` ganha
  `referencia_tipo`/`referencia_id` + unique `(empresa_id, referencia_tipo,
  referencia_id)` — evita duplicar o mesmo alerta automático a cada geração.
- `lib/alertas.ts`: `gerarAlertasAutomaticos(supabase)` — roda a cada carga do
  layout autenticado (idempotente via upsert `ignoreDuplicates`):
  - **Contas a receber vencidas** (`pendente`/`atrasado` com `vencimento <
    hoje`): marca `status = 'atrasado'` e cria alerta `conta_atrasada`.
  - **Pátio prolongado**: veículo com `status = 'no_patio'` há mais de 3 dias
    → alerta `patio_prolongado`.
  - **Viagens atrasadas**: `agendada`/`em_andamento` com `data < hoje` →
    alerta `viagem_atrasada`.
- `app/(dashboard)/layout.tsx`: chama `gerarAlertasAutomaticos` antes de
  buscar os alertas não lidos do sino.

### ✅ Sub-fase 6.6 — Automações financeiras na conclusão da viagem

- `supabase/migrations/0008_alertas_automaticos.sql`: nova origem `'viagem'`
  no check de `lancamentos_financeiros.origem`.
- `lib/types.ts`: `LancamentoOrigem` + `LANCAMENTO_ORIGEM_LABEL` ganham
  `viagem` ("Viagem concluída").
- `app/(dashboard)/viagens/actions.ts`: `updateViagemStatus` —
  - ao mudar status para `concluida`, cria automaticamente um
    `lancamentos_financeiros` (receita, categoria "Frete", valor da viagem,
    origem `viagem`, vinculado via `viagem_id`); idempotente (não duplica se
    já existe um lançamento `origem = 'viagem'` para a viagem).
  - ao sair de `concluida` para outro status, remove o lançamento
    auto-gerado (`viagem_id` + `origem = 'viagem'`), preservando lançamentos
    manuais.
  - revalida `/financeiro` e `/` além de `/viagens*`.

**Pendente**: aplicar `0008_alertas_automaticos.sql` no Supabase remoto.

## 🚧 Design system pass

### ✅ Fase A — Tokens e correção de layout

- `app/globals.css`: novos tokens `--brand`/`--brand-foreground`/`--brand-strong`
  (âmbar como acento, com variante mais escura para texto/hover, claro e
  escuro), expostos via `@theme inline` (`--color-brand*`). `--background`
  ajustado para um neutro levemente mais escuro que `--card` (mais
  profundidade nos cards no tema claro).
- `components/ui/button.tsx`: nova variant `brand` (gradiente âmbar +
  `text-brand-foreground`), substitui as 9 ocorrências do gradiente
  hardcoded `from-[#ECD08C] via-[#D4A84A] to-[#B89238] text-background`
  espalhadas por páginas e formulários (Viagens, Frota, Pátio, Financeiro,
  login).
- `app/(dashboard)/layout.tsx`: `<main>` ganhou `min-w-0 overflow-x-hidden`
  + wrapper `mx-auto max-w-screen-2xl min-w-0`, evitando overflow horizontal
  da página inteira.
- Headers de página (Viagens/Frota/Pátio) e `CardHeader` do Financeiro
  ganharam `flex-wrap` para o botão de ação nunca ser cortado em telas
  estreitas.
- **BUG corrigido**: `ViagemForm` usava `String(viagem.valor)` (formato
  `"13123.21"`, ponto decimal) como `defaultValue` do campo Valor. Ao salvar
  sem alterar, `parseValor` (que trata `.` como separador de milhar)
  removia o ponto e lia `1312321` — multiplicando o valor por ~100 a cada
  edição. Corrigido para `viagem.valor.toFixed(2).replace(".", ",")`
  (formato `"13123,21"`, pt-BR). Linhas já corrompidas no banco precisam de
  correção manual de dado (não é um problema de seed).

### ✅ Fase B — Componentes reutilizáveis

- `components/dashboard/kpi-card.tsx`: `KPICard` (ícone em badge âmbar +
  label + valor `font-mono tabular-nums` + linha de contexto opcional com
  tom `pos`/`neg`/`neutral`). Usado na Fase C.
- `components/dashboard/panel-card.tsx`: `PanelCard` (título + ação opcional
  + conteúdo), para "próximas a receber", "alertas", "últimas viagens" na
  Fase C.
- `components/shared/empty-state.tsx`: `EmptyState` (ícone em badge âmbar +
  título + descrição + botão de ação opcional; prop `bare` para usar dentro
  de um `Card` já existente sem aninhar cards). Aplicado em Viagens, Frota,
  Pátio (no pátio/histórico) e Financeiro (lançamentos/contas).
- `components/ui/table.tsx`: `TableHead` mais discreto
  (`text-muted-foreground uppercase text-xs tracking-wide`), `TableBody`
  com zebra sutil (`nth-child(even):bg-muted/30`), header sem hover.
- `lib/types.ts`: badge de viagem `em_andamento` agora usa `bg-brand/10
  text-brand-strong` (âmbar), conforme convenção de status
  (atrasado=vermelho, pendente=amarelo, concluída=verde, em
  andamento=âmbar).
- `components/ui/sidebar.tsx`: item ativo do menu agora usa
  `bg-brand/10 text-brand-strong` em vez da pílula cinza apagada.

### ✅ Fase C — Dashboard (Início) repaginado

- `npm install recharts` (gráfico de barras).
- `components/dashboard/cash-flow-chart.tsx`: `CashFlowChart` (Recharts
  `BarChart`, receita em âmbar `var(--color-brand)`, despesa em vermelho
  `var(--color-neg)`, tooltip customizado em pt-BR, eixo Y compacto).
- `app/(dashboard)/page.tsx` reescrito:
  - 4 `KPICard` (Caixa do mês com variação vs. mês anterior, A receber com
    contagem de atrasadas/pendentes, Lucro do período acumulado, Viagens
    hoje com contagem em andamento).
  - Novas queries: lançamentos dos últimos 6 meses (para o gráfico + cálculo
    do mês anterior), contas a receber pendentes/atrasadas (cliente +
    vencimento), últimas 5 viagens, últimos 5 alertas, contagem de viagens
    em andamento.
  - `PanelCard` full-width com `CashFlowChart` (6 meses).
  - 3 `PanelCard`s em grid: "Próximas a receber" (lista por vencimento),
    "Alertas" (com link "Ver todos" para `/alertas`, ponto âmbar p/ não
    lidos), "Últimas viagens" (linkando para `/viagens/[id]`).

### ✅ Fase D — Responsividade mobile

- `app/(dashboard)/financeiro/page.tsx`: tabelas de Lançamentos e Contas a
  receber agora viram cards empilhados em `<sm` (mesmo padrão já usado em
  Viagens), tabela completa só a partir de `sm:`.
- Sidebar mobile (sheet via `SidebarTrigger`/`SidebarProvider`) e
  `overflow-x-hidden` do `<main>` (Fase A) já garantem que nenhuma página
  estoura a largura da tela; Frota e Pátio mantêm tabela com scroll
  horizontal interno (poucas colunas, não critico).

**Pendente**: nenhum item das fases A–D. Próximo: revisão geral do usuário.
