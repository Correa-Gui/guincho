-- Vincula motorista aos lançamentos financeiros (receita/despesa) e aos
-- rascunhos do WhatsApp, e normaliza motoristas.telefone para casar com o
-- número de quem envia mensagem no grupo (JID da Evolution API).

alter table lancamentos_financeiros
  add column motorista_id uuid references motoristas (id) on delete set null;

create index lancamentos_financeiros_motorista_id_idx on lancamentos_financeiros (motorista_id);

alter table lancamentos_pendentes
  add column motorista_id uuid references motoristas (id) on delete set null;

-- Dígitos puros do telefone (ex: "(16) 99999-8888" -> "16999998888"), pra
-- casar com numeroDoJid(participant) sem depender de formatação manual.
alter table motoristas
  add column telefone_normalizado text generated always as (
    regexp_replace(coalesce(telefone, ''), '\D', '', 'g')
  ) stored;

create index motoristas_telefone_normalizado_idx
  on motoristas (empresa_id, telefone_normalizado)
  where telefone_normalizado <> '';
