-- Fase 6.1: localidades (IBGE) nas viagens + cache de fallback de coordenadas

alter table viagens
  add column if not exists origem_cidade text,
  add column if not exists origem_uf text,
  add column if not exists origem_ibge text,
  add column if not exists origem_lat numeric(9, 6),
  add column if not exists origem_lon numeric(9, 6),
  add column if not exists destino_cidade text,
  add column if not exists destino_uf text,
  add column if not exists destino_ibge text,
  add column if not exists destino_lat numeric(9, 6),
  add column if not exists destino_lon numeric(9, 6);

-- ============================================================
-- municipios_coords_fallback
-- ============================================================
-- Tabela de referência global (sem empresa_id). Usada apenas quando um
-- município não tem coordenadas no dataset estático (lib/data/ibge-municipios.json)
-- e precisa ser geocodificado via Nominatim.
create table if not exists municipios_coords_fallback (
  ibge_codigo text primary key,
  lat numeric(9, 6) not null,
  lon numeric(9, 6) not null,
  fonte text not null default 'nominatim',
  criado_em timestamptz not null default now()
);

alter table municipios_coords_fallback enable row level security;

create policy "municipios_coords_fallback_select" on municipios_coords_fallback
  for select using (true);
