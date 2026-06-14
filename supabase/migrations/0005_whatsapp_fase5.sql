-- Fase 5.1: WhatsApp (grupo) + IA — tabelas, campos e storage de comprovantes

-- ============================================================
-- grupos_whatsapp
-- ============================================================
create table grupos_whatsapp (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  grupo_jid text not null unique,
  nome text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create index grupos_whatsapp_empresa_id_idx on grupos_whatsapp (empresa_id);

-- ============================================================
-- participantes_whatsapp (mapeamento opcional autor -> usuário)
-- ============================================================
create table participantes_whatsapp (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  participant_jid text not null,
  usuario_id uuid references usuarios (id) on delete set null,
  nome_exibicao text,
  created_at timestamptz not null default now(),
  unique (empresa_id, participant_jid)
);

create index participantes_whatsapp_empresa_id_idx on participantes_whatsapp (empresa_id);

-- ============================================================
-- lancamentos_pendentes (rascunho por grupo + participant)
-- ============================================================
create table lancamentos_pendentes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  grupo_jid text not null,
  participant text not null,
  origem text not null check (origem in ('whatsapp_audio', 'whatsapp_foto', 'whatsapp_texto')),
  payload jsonb not null,
  media_url text,
  message_id text,
  status text not null default 'pendente' check (status in ('pendente', 'confirmado', 'expirado', 'erro')),
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null default (now() + interval '1 hour'),
  atualizado_em timestamptz not null default now()
);

create index lancamentos_pendentes_empresa_id_idx on lancamentos_pendentes (empresa_id);
create index lancamentos_pendentes_busca_idx
  on lancamentos_pendentes (empresa_id, grupo_jid, participant, status);

-- ============================================================
-- whatsapp_mensagens_processadas (dedupe global por message id)
-- ============================================================
create table whatsapp_mensagens_processadas (
  message_id text primary key,
  criado_em timestamptz not null default now()
);

-- ============================================================
-- lancamentos_financeiros: origem + anexo do comprovante
-- ============================================================
alter table lancamentos_financeiros
  add column if not exists origem text not null default 'manual'
    check (origem in ('manual', 'whatsapp_audio', 'whatsapp_foto', 'whatsapp_texto')),
  add column if not exists anexo_url text;

-- ============================================================
-- RLS
-- ============================================================
alter table grupos_whatsapp enable row level security;
alter table participantes_whatsapp enable row level security;
alter table lancamentos_pendentes enable row level security;
alter table whatsapp_mensagens_processadas enable row level security;

create policy "grupos_whatsapp_all" on grupos_whatsapp
  for all using (empresa_id = empresa_atual()) with check (empresa_id = empresa_atual());

create policy "participantes_whatsapp_all" on participantes_whatsapp
  for all using (empresa_id = empresa_atual()) with check (empresa_id = empresa_atual());

create policy "lancamentos_pendentes_all" on lancamentos_pendentes
  for all using (empresa_id = empresa_atual()) with check (empresa_id = empresa_atual());

-- whatsapp_mensagens_processadas: sem policies (RLS habilitado e sem grants)
-- só acessível via service role (webhook), nunca pelo cliente autenticado.

-- ============================================================
-- Storage: bucket de comprovantes (isolado por empresa)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('comprovantes', 'comprovantes', false)
on conflict (id) do nothing;

create policy "comprovantes_select_empresa" on storage.objects
  for select using (
    bucket_id = 'comprovantes'
    and (storage.foldername(name))[1] = empresa_atual()::text
  );

create policy "comprovantes_insert_empresa" on storage.objects
  for insert with check (
    bucket_id = 'comprovantes'
    and (storage.foldername(name))[1] = empresa_atual()::text
  );

create policy "comprovantes_update_empresa" on storage.objects
  for update using (
    bucket_id = 'comprovantes'
    and (storage.foldername(name))[1] = empresa_atual()::text
  );

create policy "comprovantes_delete_empresa" on storage.objects
  for delete using (
    bucket_id = 'comprovantes'
    and (storage.foldername(name))[1] = empresa_atual()::text
  );
