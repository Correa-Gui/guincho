-- Fase 7: relatório diário de resumo financeiro enviado por WhatsApp

create table relatorio_diario_destinatarios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  numero text not null,
  nome text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (empresa_id, numero)
);

create index relatorio_diario_destinatarios_empresa_id_idx
  on relatorio_diario_destinatarios (empresa_id);

alter table relatorio_diario_destinatarios enable row level security;

create policy "relatorio_diario_destinatarios_all" on relatorio_diario_destinatarios
  for all using (empresa_id = empresa_atual()) with check (empresa_id = empresa_atual());
