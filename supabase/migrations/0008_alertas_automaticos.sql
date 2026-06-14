-- Sub-fase 6.5: geração automática de alertas
-- Sub-fase 6.6: automações financeiras na conclusão da viagem

-- ============================================================
-- alertas: referência à entidade que originou o alerta automático,
-- evita duplicar o mesmo alerta a cada geração.
-- ============================================================
alter table alertas
  add column if not exists referencia_tipo text,
  add column if not exists referencia_id uuid;

alter table alertas
  add constraint alertas_referencia_unique unique (empresa_id, referencia_tipo, referencia_id);

-- ============================================================
-- lancamentos_financeiros: nova origem 'viagem' (lançamento gerado
-- automaticamente ao concluir uma viagem).
-- ============================================================
alter table lancamentos_financeiros
  drop constraint if exists lancamentos_financeiros_origem_check,
  add constraint lancamentos_financeiros_origem_check
    check (origem in ('manual', 'whatsapp_audio', 'whatsapp_foto', 'whatsapp_texto', 'fixo', 'abastecimento', 'viagem'));
