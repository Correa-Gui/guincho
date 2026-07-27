-- Tarifa por km configurável por veículo (frota). Quando nulo, usa a tarifa padrão da empresa.

alter table veiculos_frota
  add column if not exists tarifa_km numeric(10, 2);
