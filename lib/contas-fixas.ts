import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContaFixa } from "@/lib/types";

/**
 * Garante que toda conta fixa ativa tenha um lançamento gerado para o mês
 * atual (idempotente — usa conta_fixa_id + janela do mês para não duplicar).
 */
export async function gerarLancamentosDoMes(supabase: SupabaseClient): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("empresa_id")
    .eq("id", user.id)
    .single();

  const empresaId = usuario?.empresa_id;
  if (!empresaId) return;

  const { data: contasFixas } = await supabase
    .from("contas_fixas")
    .select("id, descricao, tipo, categoria, valor, dia_vencimento, ativo, created_at")
    .eq("ativo", true)
    .returns<ContaFixa[]>();

  if (!contasFixas || contasFixas.length === 0) return;

  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();
  const inicioMes = `${ano}-${String(mes + 1).padStart(2, "0")}-01`;
  const inicioMesSeguinte = `${mes === 11 ? ano + 1 : ano}-${String(((mes + 1) % 12) + 1).padStart(2, "0")}-01`;

  const { data: existentes } = await supabase
    .from("lancamentos_financeiros")
    .select("conta_fixa_id")
    .not("conta_fixa_id", "is", null)
    .gte("data", inicioMes)
    .lt("data", inicioMesSeguinte);

  const idsComLancamento = new Set((existentes ?? []).map((l) => l.conta_fixa_id));
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();

  const novos = contasFixas
    .filter((conta) => !idsComLancamento.has(conta.id))
    .map((conta) => {
      const dia = Math.min(conta.dia_vencimento, diasNoMes);
      return {
        empresa_id: empresaId,
        conta_fixa_id: conta.id,
        tipo: conta.tipo,
        categoria: conta.categoria,
        valor: conta.valor,
        descricao: conta.descricao,
        data: `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`,
        origem: "fixo" as const,
      };
    });

  if (novos.length === 0) return;

  await supabase.from("lancamentos_financeiros").insert(novos);
}
