-- Fase 6.2: cache de rotas (distância/duração entre municípios)

create table if not exists rotas_cache (
  origem_ibge text not null,
  destino_ibge text not null,
  distancia_km numeric(10, 2) not null,
  duracao_min numeric(10, 2) not null,
  pedagio_estimado numeric(10, 2),
  fonte text not null default 'osrm',
  atualizado_em timestamptz not null default now(),
  primary key (origem_ibge, destino_ibge)
);

alter table rotas_cache enable row level security;

-- Tabela de referência global (sem empresa_id), mesmo padrão de
-- municipios_coords_fallback: leitura e escrita liberadas pra qualquer
-- usuário autenticado, já que o conteúdo é só dado de rota (não sensível).
create policy "rotas_cache_select" on rotas_cache
  for select using (true);

create policy "rotas_cache_insert" on rotas_cache
  for insert with check (true);
