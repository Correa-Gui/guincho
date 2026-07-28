-- Quilometragem da viagem: km_inicial é opcional (motorista escolhe informar
-- na abertura), km_final só é preenchido no encerramento (/encerrar via
-- WhatsApp). km_rodado é derivado, nunca gravado direto.
alter table viagens
  add column km_inicial numeric(10, 2),
  add column km_final numeric(10, 2),
  add column km_rodado numeric(10, 2) generated always as (km_final - km_inicial) stored,
  add constraint viagens_km_final_maior_igual_inicial
    check (km_final is null or km_inicial is null or km_final >= km_inicial);

-- ============================================================
-- viagem_km_perguntas: pergunta pendente de "deseja informar o KM inicial?"
-- feita na confirmação de abertura da viagem via WhatsApp. Mesmo padrão de
-- lancamentos_pendentes (grupo + participant + expiração).
-- ============================================================
create table viagem_km_perguntas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  viagem_id uuid not null references viagens (id) on delete cascade,
  grupo_jid text not null,
  participant text not null,
  status text not null default 'pendente' check (status in ('pendente', 'respondida', 'expirada')),
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null default (now() + interval '30 minutes')
);

create index viagem_km_perguntas_busca_idx
  on viagem_km_perguntas (empresa_id, grupo_jid, participant, status);

alter table viagem_km_perguntas enable row level security;

create policy "viagem_km_perguntas_all" on viagem_km_perguntas
  for all using (empresa_id = empresa_atual()) with check (empresa_id = empresa_atual());
