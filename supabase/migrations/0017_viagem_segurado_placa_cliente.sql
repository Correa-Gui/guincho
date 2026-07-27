-- Dados do veículo atendido no guincho: nome do segurado/cliente dono do
-- veículo e a placa desse veículo (distinta de veiculo_id, que é o veículo
-- da FROTA que faz o serviço).
alter table viagens
  add column segurado text,
  add column placa_cliente text;
