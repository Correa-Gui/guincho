-- Seguradora (empresa de seguro, ex: "Porto Seguro") é distinta do segurado
-- (pessoa dona do veículo guinchado, ex: "João") — campos independentes.
alter table viagens
  add column seguradora text;
