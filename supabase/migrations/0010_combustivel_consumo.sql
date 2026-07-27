-- Fase 6.4: preço de combustível (empresa) e consumo médio (por veículo),
-- usados na sugestão de preço de viagem (custo de combustível estimado).

alter table empresas
  add column if not exists preco_combustivel_padrao numeric(10, 3) not null default 6.00;

alter table veiculos_frota
  add column if not exists consumo_kml numeric(10, 2);
