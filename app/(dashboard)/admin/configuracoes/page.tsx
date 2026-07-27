import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeleteButton } from "@/components/shared/delete-button";
import { ConfiguracaoForm } from "@/components/configuracoes/configuracao-form";
import { ParametrosViagemForm } from "@/components/configuracoes/parametros-viagem-form";
import { DestinatarioRelatorioForm } from "@/components/configuracoes/destinatario-relatorio-form";
import { ToggleDestinatarioButton } from "@/components/configuracoes/toggle-destinatario-button";
import { EnviarRelatorioTesteButton } from "@/components/configuracoes/enviar-relatorio-teste-button";
import { createClient } from "@/lib/supabase/server";
import { LANCAMENTO_CATEGORIAS } from "@/lib/types";
import {
  buscarConfiguracaoIA,
  DEFAULT_PROMPT_INTERPRETAR_MENSAGEM,
  DEFAULT_PROMPT_LER_COMPROVANTE,
  DEFAULT_PROMPT_TRANSCREVER_AUDIO,
} from "@/lib/ai";
import { deleteDestinatarioRelatorio } from "./actions";

type DestinatarioRelatorio = { id: string; numero: string; nome: string | null; ativo: boolean };

const PROVIDER_PADRAO = process.env.AI_PROVIDER ?? "gemini";
const MODELO_PADRAO_GEMINI = process.env.GEMINI_MODEL ?? "gemini-3.5-flash";
const MODELO_PADRAO_OPENAI = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

export default async function ConfiguracoesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: usuario } = user
    ? await supabase.from("usuarios").select("empresa_id").eq("id", user.id).single()
    : { data: null };

  const empresaId = usuario?.empresa_id ?? null;
  const config = empresaId ? await buscarConfiguracaoIA(supabase, empresaId) : undefined;

  const { data: empresa } = empresaId
    ? await supabase
        .from("empresas")
        .select(
          "tarifa_km_padrao, preco_combustivel_padrao, base_endereco, base_cidade, base_uf, base_ibge, base_lat, base_lon",
        )
        .eq("id", empresaId)
        .single()
    : { data: null };

  const { data: destinatarios } = empresaId
    ? await supabase
        .from("relatorio_diario_destinatarios")
        .select("id, numero, nome, ativo")
        .eq("empresa_id", empresaId)
        .order("created_at")
        .returns<DestinatarioRelatorio[]>()
    : { data: null };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Configurações de IA
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ajuste o modelo, as categorias de lançamento e os prompts usados pela IA no fluxo de
          WhatsApp. Campos em branco usam o padrão do sistema.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Custos e tarifas de viagem</CardTitle>
        </CardHeader>
        <CardContent>
          <ParametrosViagemForm
            tarifaKmPadrao={empresa?.tarifa_km_padrao ?? 5}
            precoCombustivelPadrao={empresa?.preco_combustivel_padrao ?? 6}
            base={
              empresa?.base_ibge
                ? {
                    endereco: empresa.base_endereco ?? "",
                    cidade: empresa.base_cidade ?? "",
                    uf: empresa.base_uf ?? "",
                    ibge: empresa.base_ibge,
                    lat: empresa.base_lat ?? 0,
                    lon: empresa.base_lon ?? 0,
                  }
                : null
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle>Relatório diário no WhatsApp</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Números que recebem o resumo diário (saldo, despesas por categoria e viagens) pelo
              WhatsApp.
            </p>
          </div>
          {(destinatarios ?? []).some((d) => d.ativo) ? <EnviarRelatorioTesteButton /> : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <DestinatarioRelatorioForm />

          {(destinatarios ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum número cadastrado ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(destinatarios ?? []).map((destinatario) => (
                  <TableRow key={destinatario.id}>
                    <TableCell>{destinatario.nome ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{destinatario.numero}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          destinatario.ativo ? "bg-pos/10 text-pos" : "bg-muted text-muted-foreground"
                        }
                      >
                        {destinatario.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <ToggleDestinatarioButton id={destinatario.id} ativo={destinatario.ativo} />
                        <DeleteButton
                          action={deleteDestinatarioRelatorio.bind(null, destinatario.id)}
                          confirmMessage="Remover este número da lista do relatório diário?"
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Modelo, categorias e prompts</CardTitle>
        </CardHeader>
        <CardContent>
          <ConfiguracaoForm
            config={config}
            defaults={{
              provider: PROVIDER_PADRAO,
              modeloGemini: MODELO_PADRAO_GEMINI,
              modeloOpenai: MODELO_PADRAO_OPENAI,
              categoriasReceita: LANCAMENTO_CATEGORIAS.receita,
              categoriasDespesa: LANCAMENTO_CATEGORIAS.despesa,
              promptTranscreverAudio: DEFAULT_PROMPT_TRANSCREVER_AUDIO,
              promptLerComprovante: DEFAULT_PROMPT_LER_COMPROVANTE,
              promptInterpretarMensagem: DEFAULT_PROMPT_INTERPRETAR_MENSAGEM,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
