export type ViagemStatus = "agendada" | "em_andamento" | "concluida" | "cancelada";

export const VIAGEM_STATUS_LABEL: Record<ViagemStatus, string> = {
  agendada: "Agendada",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export const VIAGEM_STATUS_BADGE_CLASS: Record<ViagemStatus, string> = {
  agendada: "bg-info/10 text-info",
  em_andamento: "bg-brand/10 text-brand-strong",
  concluida: "bg-pos/10 text-pos",
  cancelada: "bg-neg/10 text-neg",
};

export type Cliente = {
  id: string;
  nome: string;
};

export type Motorista = {
  id: string;
  nome: string;
};

export type VeiculoFrota = {
  id: string;
  placa: string;
  modelo: string | null;
};

export type Viagem = {
  id: string;
  cliente_id: string | null;
  motorista_id: string | null;
  veiculo_id: string | null;
  origem: string | null;
  destino: string | null;
  origem_cidade: string | null;
  origem_uf: string | null;
  origem_ibge: string | null;
  origem_lat: number | null;
  origem_lon: number | null;
  destino_cidade: string | null;
  destino_uf: string | null;
  destino_ibge: string | null;
  destino_lat: number | null;
  destino_lon: number | null;
  distancia_km: number | null;
  pedagio_estimado: number | null;
  valor: number;
  status: ViagemStatus;
  data: string;
  observacoes: string | null;
  created_at: string;
  clientes: { nome: string } | null;
  motoristas: { nome: string } | null;
  veiculos_frota: { placa: string; modelo: string | null } | null;
};

// ============================================================
// Financeiro
// ============================================================
export type LancamentoTipo = "receita" | "despesa";

export const LANCAMENTO_TIPO_LABEL: Record<LancamentoTipo, string> = {
  receita: "Receita",
  despesa: "Despesa",
};

export const LANCAMENTO_TIPO_BADGE_CLASS: Record<LancamentoTipo, string> = {
  receita: "bg-pos/10 text-pos",
  despesa: "bg-neg/10 text-neg",
};

export const LANCAMENTO_CATEGORIAS = {
  receita: ["Frete", "Guincho", "Outros"],
  despesa: ["Combustível", "Manutenção", "Pedágio", "Salário", "Outros"],
} as const;

export type LancamentoOrigem =
  | "manual"
  | "whatsapp_audio"
  | "whatsapp_foto"
  | "whatsapp_texto"
  | "fixo"
  | "abastecimento"
  | "viagem";

export type LancamentoFinanceiro = {
  id: string;
  viagem_id: string | null;
  conta_fixa_id: string | null;
  tipo: LancamentoTipo;
  categoria: string;
  valor: number;
  descricao: string | null;
  data: string;
  origem: LancamentoOrigem;
  anexo_url: string | null;
  created_at: string;
  viagens: { id: string; origem: string | null; destino: string | null } | null;
};

export type ContaStatus = "pendente" | "pago" | "atrasado";

export const CONTA_STATUS_LABEL: Record<ContaStatus, string> = {
  pendente: "Pendente",
  pago: "Pago",
  atrasado: "Atrasado",
};

export const CONTA_STATUS_BADGE_CLASS: Record<ContaStatus, string> = {
  pendente: "bg-warn/10 text-warn",
  pago: "bg-pos/10 text-pos",
  atrasado: "bg-neg/10 text-neg",
};

export type ContaAReceber = {
  id: string;
  viagem_id: string | null;
  cliente_id: string | null;
  valor: number;
  vencimento: string;
  status: ContaStatus;
  created_at: string;
  clientes: { nome: string } | null;
  viagens: { id: string; origem: string | null; destino: string | null } | null;
};

// ============================================================
// Frota
// ============================================================
export type VeiculoStatus = "ativo" | "manutencao" | "inativo";

export const VEICULO_STATUS_LABEL: Record<VeiculoStatus, string> = {
  ativo: "Ativo",
  manutencao: "Manutenção",
  inativo: "Inativo",
};

export const VEICULO_STATUS_BADGE_CLASS: Record<VeiculoStatus, string> = {
  ativo: "bg-pos/10 text-pos",
  manutencao: "bg-warn/10 text-warn",
  inativo: "bg-neg/10 text-neg",
};

export type VeiculoFrotaCompleto = {
  id: string;
  placa: string;
  modelo: string | null;
  ano: number | null;
  status: VeiculoStatus;
  created_at: string;
};

// ============================================================
// Abastecimentos
// ============================================================
export type Abastecimento = {
  id: string;
  veiculo_id: string | null;
  motorista_id: string | null;
  data: string;
  litros: number;
  valor_litro: number;
  valor_total: number;
  km_atual: number | null;
  posto: string | null;
  observacoes: string | null;
  lancamento_id: string | null;
  created_at: string;
  veiculos_frota: { placa: string; modelo: string | null } | null;
  motoristas: { nome: string } | null;
};

// ============================================================
// Pátio
// ============================================================
export type PatioStatus = "no_patio" | "liberado";

export const PATIO_STATUS_LABEL: Record<PatioStatus, string> = {
  no_patio: "No pátio",
  liberado: "Liberado",
};

export const PATIO_STATUS_BADGE_CLASS: Record<PatioStatus, string> = {
  no_patio: "bg-warn/10 text-warn",
  liberado: "bg-pos/10 text-pos",
};

export type Patio = {
  id: string;
  veiculo_placa: string;
  motivo: string | null;
  entrada: string;
  saida: string | null;
  status: PatioStatus;
  created_at: string;
};

// ============================================================
// Alertas
// ============================================================
export type Alerta = {
  id: string;
  tipo: string;
  mensagem: string;
  lido: boolean;
  created_at: string;
};

// ============================================================
// Contas fixas
// ============================================================
export type ContaFixa = {
  id: string;
  descricao: string;
  tipo: LancamentoTipo;
  categoria: string;
  valor: number;
  dia_vencimento: number;
  ativo: boolean;
  created_at: string;
};

// ============================================================
// WhatsApp (Fase 5)
// ============================================================
export const LANCAMENTO_ORIGEM_LABEL: Record<LancamentoOrigem, string> = {
  manual: "Manual",
  fixo: "Conta fixa",
  abastecimento: "Abastecimento",
  viagem: "Viagem concluída",
  whatsapp_audio: "WhatsApp (áudio)",
  whatsapp_foto: "WhatsApp (foto)",
  whatsapp_texto: "WhatsApp (texto)",
};

export type RascunhoStatus = "pendente" | "confirmado" | "erro" | "expirado";

export const RASCUNHO_STATUS_LABEL: Record<RascunhoStatus, string> = {
  pendente: "Pendente",
  confirmado: "Confirmado",
  erro: "Erro",
  expirado: "Expirado",
};

export const RASCUNHO_STATUS_BADGE_CLASS: Record<RascunhoStatus, string> = {
  pendente: "bg-warn/10 text-warn",
  confirmado: "bg-pos/10 text-pos",
  erro: "bg-neg/10 text-neg",
  expirado: "bg-muted text-muted-foreground",
};

export type GrupoWhatsapp = {
  id: string;
  grupo_jid: string;
  nome: string | null;
  ativo: boolean;
  created_at: string;
};

export type LancamentoPendentePayload = {
  tipo: LancamentoTipo;
  valor: number | null;
  categoria: string;
  data: string;
  descricao: string | null;
  estabelecimento?: string | null;
};

export type LancamentoPendente = {
  id: string;
  grupo_jid: string;
  participant: string;
  origem: LancamentoOrigem;
  payload: LancamentoPendentePayload;
  status: RascunhoStatus;
  criado_em: string;
};
