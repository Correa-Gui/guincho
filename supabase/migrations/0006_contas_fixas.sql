-- Contas fixas (recorrentes mensais: aluguel, internet, contratos fixos etc.)

create table contas_fixas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  descricao text not null,
  tipo text not null check (tipo in ('receita', 'despesa')),
  categoria text not null,
  valor numeric(12, 2) not null,
  dia_vencimento integer not null default 1 check (dia_vencimento between 1 and 28),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create index contas_fixas_empresa_id_idx on contas_fixas (empresa_id);

alter table contas_fixas enable row level security;

create policy "contas_fixas_all" on contas_fixas
  for all using (empresa_id = empresa_atual()) with check (empresa_id = empresa_atual());

-- ============================================================
-- lancamentos_financeiros: vínculo com a conta fixa que o gerou
-- ============================================================
alter table lancamentos_financeiros
  add column if not exists conta_fixa_id uuid references contas_fixas (id) on delete set null;

create index lancamentos_financeiros_conta_fixa_id_idx on lancamentos_financeiros (conta_fixa_id);

alter table lancamentos_financeiros
  drop constraint if exists lancamentos_financeiros_origem_check,
  add constraint lancamentos_financeiros_origem_check
    check (origem in ('manual', 'whatsapp_audio', 'whatsapp_foto', 'whatsapp_texto', 'fixo'));
