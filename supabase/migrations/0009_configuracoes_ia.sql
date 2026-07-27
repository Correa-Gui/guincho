-- Fase 5.6+: configurações de IA por empresa (modelo, prompts e categorias
-- usados no fluxo WhatsApp/IA). Campos nulos = usa o padrão do código.

create table configuracoes_ia (
  empresa_id uuid primary key references empresas (id) on delete cascade,
  modelo text,
  categorias_receita text[],
  categorias_despesa text[],
  prompt_transcrever_audio text,
  prompt_ler_comprovante text,
  prompt_interpretar_mensagem text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table configuracoes_ia enable row level security;

create policy "configuracoes_ia_all" on configuracoes_ia
  for all using (empresa_id = empresa_atual()) with check (empresa_id = empresa_atual());
