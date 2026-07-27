-- Fase 7: controle de manutenção (troca de óleo, balanceamento, etc.) e de
-- documentos da frota (CRLV, seguro, ANTT, tacógrafo...) com vencimento.

-- ============================================================
-- manutencoes_frota
-- ============================================================
create table manutencoes_frota (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  veiculo_id uuid not null references veiculos_frota (id) on delete cascade,
  tipo text not null check (tipo in (
    'troca_oleo', 'troca_filtro', 'balanceamento', 'alinhamento',
    'rodizio_pneus', 'troca_pneus', 'freios', 'revisao', 'bateria', 'outro'
  )),
  data_realizada date not null,
  data_proxima date,
  custo numeric(12, 2),
  observacoes text,
  created_at timestamptz not null default now()
);

create index manutencoes_frota_empresa_id_idx on manutencoes_frota (empresa_id);
create index manutencoes_frota_veiculo_id_idx on manutencoes_frota (veiculo_id);

alter table manutencoes_frota enable row level security;

create policy "manutencoes_frota_all" on manutencoes_frota
  for all using (empresa_id = empresa_atual()) with check (empresa_id = empresa_atual());

-- ============================================================
-- documentos_frota
-- ============================================================
create table documentos_frota (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  veiculo_id uuid not null references veiculos_frota (id) on delete cascade,
  tipo text not null check (tipo in (
    'crlv', 'seguro', 'antt', 'tacografo', 'licenciamento', 'outro'
  )),
  numero text,
  vencimento date not null,
  observacoes text,
  created_at timestamptz not null default now()
);

create index documentos_frota_empresa_id_idx on documentos_frota (empresa_id);
create index documentos_frota_veiculo_id_idx on documentos_frota (veiculo_id);
create index documentos_frota_vencimento_idx on documentos_frota (empresa_id, vencimento);

alter table documentos_frota enable row level security;

create policy "documentos_frota_all" on documentos_frota
  for all using (empresa_id = empresa_atual()) with check (empresa_id = empresa_atual());
