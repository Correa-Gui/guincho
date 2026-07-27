-- Endereço da base (garagem) da empresa, usado pra calcular o retorno do
-- guincho depois da viagem (distância/pedágio/combustível de volta).

alter table empresas
  add column if not exists base_endereco text,
  add column if not exists base_cidade text,
  add column if not exists base_uf text,
  add column if not exists base_ibge text,
  add column if not exists base_lat double precision,
  add column if not exists base_lon double precision;
