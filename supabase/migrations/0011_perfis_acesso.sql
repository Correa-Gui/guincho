-- Perfis de acesso: define quais páginas/menus cada tipo de usuário pode ver

create table perfis_acesso (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  nome text not null,
  paginas text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index perfis_acesso_empresa_id_idx on perfis_acesso (empresa_id);

alter table usuarios
  add column perfil_id uuid references perfis_acesso (id) on delete set null;

alter table perfis_acesso enable row level security;

create policy "perfis_acesso_all" on perfis_acesso
  for all using (empresa_id = empresa_atual()) with check (empresa_id = empresa_atual());
