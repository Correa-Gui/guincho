-- Abastecimentos (registro de combustível por veículo)

create table abastecimentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  veiculo_id uuid references veiculos_frota (id) on delete set null,
  motorista_id uuid references motoristas (id) on delete set null,
  data date not null default current_date,
  litros numeric(10, 3) not null check (litros > 0),
  valor_litro numeric(10, 3) not null check (valor_litro > 0),
  valor_total numeric(12, 2) not null check (valor_total > 0),
  km_atual integer,
  posto text,
  observacoes text,
  lancamento_id uuid references lancamentos_financeiros (id) on delete set null,
  created_at timestamptz not null default now()
);

create index abastecimentos_empresa_id_idx on abastecimentos (empresa_id);
create index abastecimentos_veiculo_id_idx on abastecimentos (veiculo_id);
create index abastecimentos_data_idx on abastecimentos (empresa_id, data);

alter table abastecimentos enable row level security;

create policy "abastecimentos_all" on abastecimentos
  for all using (empresa_id = empresa_atual()) with check (empresa_id = empresa_atual());

-- ============================================================
-- lancamentos_financeiros: vínculo com o abastecimento que o gerou
-- ============================================================
alter table lancamentos_financeiros
  add column if not exists abastecimento_id uuid references abastecimentos (id) on delete set null;

create index lancamentos_financeiros_abastecimento_id_idx on lancamentos_financeiros (abastecimento_id);

alter table lancamentos_financeiros
  drop constraint if exists lancamentos_financeiros_origem_check,
  add constraint lancamentos_financeiros_origem_check
    check (origem in ('manual', 'whatsapp_audio', 'whatsapp_foto', 'whatsapp_texto', 'fixo', 'abastecimento'));
