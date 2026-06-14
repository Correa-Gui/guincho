-- Dados de exemplo para desenvolvimento.
-- Rode após 0001_init.sql.
--
-- IMPORTANTE: crie um usuário em Authentication > Users no painel do Supabase
-- primeiro, copie o UUID dele e substitua <AUTH_USER_ID> abaixo antes de rodar
-- o bloco final (insert em "usuarios"). Sem isso o login não terá empresa
-- vinculada e as telas ficarão vazias por causa do RLS.

insert into empresas (id, nome) values
  ('00000000-0000-0000-0000-000000000001', 'Guincho Exemplo Ltda');

insert into clientes (id, empresa_id, nome, telefone, documento) values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'João Pereira', '(11) 98888-1111', '111.111.111-11'),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', 'Transportadora Silva', '(11) 97777-2222', '12.345.678/0001-90'),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000001', 'Maria Souza', '(11) 96666-3333', '222.222.222-22');

insert into motoristas (id, empresa_id, nome, telefone, ativo) values
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001', 'Carlos Andrade', '(11) 95555-4444', true),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000001', 'Roberto Lima', '(11) 94444-5555', true);

insert into veiculos_frota (id, empresa_id, placa, modelo, ano, status) values
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000001', 'ABC1D23', 'Guincho Plataforma Ford F4000', 2018, 'ativo'),
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000001', 'XYZ9E87', 'Guincho Lança VW Delivery', 2020, 'ativo');

insert into viagens (
  id, empresa_id, cliente_id, motorista_id, veiculo_id, origem, destino,
  origem_cidade, origem_uf, origem_ibge, origem_lat, origem_lon,
  destino_cidade, destino_uf, destino_ibge, destino_lat, destino_lon,
  valor, status, data, observacoes
) values
  ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000301', 'Av. Paulista, 1000', 'Pátio Central - Zona Sul',
    'São Paulo', 'SP', '3550308', -23.5329, -46.6395,
    'São Paulo', 'SP', '3550308', -23.5329, -46.6395,
    350.00, 'concluida', current_date - 5, 'Pane elétrica'),
  ('00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000302', 'Marginal Tietê, km 12', 'Concessionária ABC',
    'São Paulo', 'SP', '3550308', -23.5329, -46.6395,
    'Guarulhos', 'SP', '3518800', -23.4538, -46.5333,
    520.00, 'concluida', current_date - 2, 'Acidente leve'),
  ('00000000-0000-0000-0000-000000000403', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000301', 'Rua Augusta, 500', 'Oficina do Zé',
    'São Paulo', 'SP', '3550308', -23.5329, -46.6395,
    'Osasco', 'SP', '3534401', -23.5324, -46.7916,
    280.00, 'em_andamento', current_date, 'Pneu furado');

insert into lancamentos_financeiros (empresa_id, viagem_id, tipo, categoria, valor, descricao, data) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000401', 'receita', 'Serviço de guincho', 350.00, 'Pagamento viagem #401', current_date - 5),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000402', 'receita', 'Serviço de guincho', 520.00, 'Pagamento viagem #402', current_date - 2),
  ('00000000-0000-0000-0000-000000000001', null, 'despesa', 'Combustível', 180.00, 'Abastecimento frota', current_date - 4),
  ('00000000-0000-0000-0000-000000000001', null, 'despesa', 'Manutenção', 95.50, 'Troca de óleo - ABC1D23', current_date - 1);

insert into contas_a_receber (empresa_id, viagem_id, cliente_id, valor, vencimento, status) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000403', '00000000-0000-0000-0000-000000000103', 280.00, current_date + 7, 'pendente'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000102', 520.00, current_date - 1, 'atrasado');

insert into patio (empresa_id, veiculo_placa, motivo, status) values
  ('00000000-0000-0000-0000-000000000001', 'QWE4R56', 'Aguardando retirada do proprietário', 'no_patio');

insert into alertas (empresa_id, tipo, mensagem) values
  ('00000000-0000-0000-0000-000000000001', 'conta_atrasada', 'Conta a receber de Transportadora Silva está atrasada.');

-- 1) Crie um usuário em Authentication > Users no painel do Supabase.
-- 2) Substitua <AUTH_USER_ID> pelo UUID desse usuário e rode:
--
-- insert into usuarios (id, empresa_id, nome) values
--   ('<AUTH_USER_ID>', '00000000-0000-0000-0000-000000000001', 'Seu Nome');
