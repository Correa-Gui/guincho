-- Fase 6.3: auto-preenchimento de km/pedágio/preço sugerido

alter table viagens
  add column if not exists distancia_km numeric(10, 2),
  add column if not exists pedagio_estimado numeric(10, 2);

alter table empresas
  add column if not exists tarifa_km_padrao numeric(10, 2) not null default 5.00;
