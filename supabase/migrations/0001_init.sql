-- Fase 1: modelo de dados base, multi-tenant via empresa_id + RLS

create extension if not exists "pgcrypto";

-- ============================================================
-- empresas
-- ============================================================
create table empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- usuarios (vinculado a auth.users)
-- ============================================================
create table usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  empresa_id uuid not null references empresas (id) on delete cascade,
  nome text not null,
  role text not null default 'admin' check (role in ('admin', 'operador')),
  created_at timestamptz not null default now()
);

create index usuarios_empresa_id_idx on usuarios (empresa_id);

-- helper: empresa do usuário autenticado
create function empresa_atual()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select empresa_id from usuarios where id = auth.uid()
$$;

-- ============================================================
-- clientes
-- ============================================================
create table clientes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  nome text not null,
  telefone text,
  documento text,
  created_at timestamptz not null default now()
);

create index clientes_empresa_id_idx on clientes (empresa_id);

-- ============================================================
-- motoristas
-- ============================================================
create table motoristas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  nome text not null,
  telefone text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create index motoristas_empresa_id_idx on motoristas (empresa_id);

-- ============================================================
-- veiculos_frota
-- ============================================================
create table veiculos_frota (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  placa text not null,
  modelo text,
  ano integer,
  status text not null default 'ativo' check (status in ('ativo', 'manutencao', 'inativo')),
  created_at timestamptz not null default now()
);

create index veiculos_frota_empresa_id_idx on veiculos_frota (empresa_id);

-- ============================================================
-- viagens
-- ============================================================
create table viagens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  cliente_id uuid references clientes (id) on delete set null,
  motorista_id uuid references motoristas (id) on delete set null,
  veiculo_id uuid references veiculos_frota (id) on delete set null,
  origem text,
  destino text,
  valor numeric(12, 2) not null default 0,
  status text not null default 'agendada' check (status in ('agendada', 'em_andamento', 'concluida', 'cancelada')),
  data date not null default current_date,
  observacoes text,
  created_at timestamptz not null default now()
);

create index viagens_empresa_id_idx on viagens (empresa_id);
create index viagens_data_idx on viagens (empresa_id, data);

-- ============================================================
-- lancamentos_financeiros
-- ============================================================
create table lancamentos_financeiros (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  viagem_id uuid references viagens (id) on delete set null,
  tipo text not null check (tipo in ('receita', 'despesa')),
  categoria text not null,
  valor numeric(12, 2) not null,
  descricao text,
  data date not null default current_date,
  created_at timestamptz not null default now()
);

create index lancamentos_financeiros_empresa_id_idx on lancamentos_financeiros (empresa_id);
create index lancamentos_financeiros_data_idx on lancamentos_financeiros (empresa_id, data);

-- ============================================================
-- contas_a_receber
-- ============================================================
create table contas_a_receber (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  viagem_id uuid references viagens (id) on delete set null,
  cliente_id uuid references clientes (id) on delete set null,
  valor numeric(12, 2) not null,
  vencimento date not null,
  status text not null default 'pendente' check (status in ('pendente', 'pago', 'atrasado')),
  created_at timestamptz not null default now()
);

create index contas_a_receber_empresa_id_idx on contas_a_receber (empresa_id);
create index contas_a_receber_vencimento_idx on contas_a_receber (empresa_id, vencimento);

-- ============================================================
-- patio
-- ============================================================
create table patio (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  veiculo_placa text not null,
  motivo text,
  entrada timestamptz not null default now(),
  saida timestamptz,
  status text not null default 'no_patio' check (status in ('no_patio', 'liberado')),
  created_at timestamptz not null default now()
);

create index patio_empresa_id_idx on patio (empresa_id);

-- ============================================================
-- alertas
-- ============================================================
create table alertas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  tipo text not null,
  mensagem text not null,
  lido boolean not null default false,
  created_at timestamptz not null default now()
);

create index alertas_empresa_id_idx on alertas (empresa_id);

-- ============================================================
-- RLS
-- ============================================================
alter table empresas enable row level security;
alter table usuarios enable row level security;
alter table clientes enable row level security;
alter table motoristas enable row level security;
alter table veiculos_frota enable row level security;
alter table viagens enable row level security;
alter table lancamentos_financeiros enable row level security;
alter table contas_a_receber enable row level security;
alter table patio enable row level security;
alter table alertas enable row level security;

-- empresas: usuário só vê a própria empresa
create policy "empresas_select" on empresas
  for select using (id = empresa_atual());

-- usuarios: usuário só vê usuários da própria empresa
create policy "usuarios_select" on usuarios
  for select using (empresa_id = empresa_atual());

create policy "usuarios_update_self" on usuarios
  for update using (id = auth.uid());

-- tabelas de negócio: CRUD completo restrito à empresa do usuário
create policy "clientes_all" on clientes
  for all using (empresa_id = empresa_atual()) with check (empresa_id = empresa_atual());

create policy "motoristas_all" on motoristas
  for all using (empresa_id = empresa_atual()) with check (empresa_id = empresa_atual());

create policy "veiculos_frota_all" on veiculos_frota
  for all using (empresa_id = empresa_atual()) with check (empresa_id = empresa_atual());

create policy "viagens_all" on viagens
  for all using (empresa_id = empresa_atual()) with check (empresa_id = empresa_atual());

create policy "lancamentos_financeiros_all" on lancamentos_financeiros
  for all using (empresa_id = empresa_atual()) with check (empresa_id = empresa_atual());

create policy "contas_a_receber_all" on contas_a_receber
  for all using (empresa_id = empresa_atual()) with check (empresa_id = empresa_atual());

create policy "patio_all" on patio
  for all using (empresa_id = empresa_atual()) with check (empresa_id = empresa_atual());

create policy "alertas_all" on alertas
  for all using (empresa_id = empresa_atual()) with check (empresa_id = empresa_atual());
