-- Retorno do guincho à base após a viagem: persiste o trecho destino→base
-- calculado a partir de empresas.base_* (0015_base_empresa.sql). Aditivo —
-- não altera distancia_km/valor existentes; histórico não é recalculado.

alter table viagens
  add column if not exists retorno_km numeric(10, 2),
  add column if not exists retorno_duracao_min integer,
  add column if not exists pedagio_retorno_estimado numeric(10, 2),
  add column if not exists valor_retorno numeric(10, 2);
