"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFormFeedback } from "@/components/shared/use-form-feedback";
import { AI_PROVIDERS, type ConfiguracaoIA } from "@/lib/ai";
import { salvarConfiguracaoIA, restaurarConfiguracaoIA } from "@/app/(dashboard)/admin/configuracoes/actions";

export function ConfiguracaoForm({
  config,
  defaults,
}: {
  config?: ConfiguracaoIA;
  defaults: {
    provider: string;
    modeloGemini: string;
    modeloOpenai: string;
    categoriasReceita: readonly string[];
    categoriasDespesa: readonly string[];
    promptTranscreverAudio: string;
    promptLerComprovante: string;
    promptInterpretarMensagem: string;
  };
}) {
  const [state, formAction, pending] = useActionState(salvarConfiguracaoIA, {});
  const [provider, setProvider] = useState(config?.provider ?? defaults.provider);

  useFormFeedback(state, { successMessage: "Configurações salvas com sucesso." });

  const modeloPadrao = provider === "openai" ? defaults.modeloOpenai : defaults.modeloGemini;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="provider">Provider de IA</Label>
          <Select name="provider" value={provider} onValueChange={(value) => setProvider(value ?? defaults.provider)}>
            <SelectTrigger id="provider" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AI_PROVIDERS.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="modelo">Modelo</Label>
          <Input
            id="modelo"
            name="modelo"
            placeholder={modeloPadrao}
            defaultValue={config?.modelo ?? ""}
          />
          <p className="text-xs text-muted-foreground">
            Em branco usa {modeloPadrao}. A transcrição de áudio no provider OpenAI sempre usa
            whisper-1 (endpoint dedicado, não configurável aqui).
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="categorias_receita">Categorias de receita</Label>
          <Input
            id="categorias_receita"
            name="categorias_receita"
            defaultValue={(config?.categoriasReceita ?? defaults.categoriasReceita).join(", ")}
          />
          <p className="text-xs text-muted-foreground">Separe as categorias por vírgula.</p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="categorias_despesa">Categorias de despesa</Label>
          <Input
            id="categorias_despesa"
            name="categorias_despesa"
            defaultValue={(config?.categoriasDespesa ?? defaults.categoriasDespesa).join(", ")}
          />
          <p className="text-xs text-muted-foreground">Separe as categorias por vírgula.</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="prompt_transcrever_audio">Prompt: transcrever áudio</Label>
        <Textarea
          id="prompt_transcrever_audio"
          name="prompt_transcrever_audio"
          rows={4}
          className="font-mono text-xs"
          defaultValue={config?.promptTranscreverAudio ?? defaults.promptTranscreverAudio}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="prompt_ler_comprovante">Prompt: ler comprovante</Label>
        <Textarea
          id="prompt_ler_comprovante"
          name="prompt_ler_comprovante"
          rows={8}
          className="font-mono text-xs"
          defaultValue={config?.promptLerComprovante ?? defaults.promptLerComprovante}
        />
        <p className="text-xs text-muted-foreground">
          Use {"{{CATEGORIAS_DESPESA}}"} para inserir a lista de categorias de despesa.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="prompt_interpretar_mensagem">Prompt: interpretar mensagem</Label>
        <Textarea
          id="prompt_interpretar_mensagem"
          name="prompt_interpretar_mensagem"
          rows={16}
          className="font-mono text-xs"
          defaultValue={config?.promptInterpretarMensagem ?? defaults.promptInterpretarMensagem}
        />
        <p className="text-xs text-muted-foreground">
          Use {"{{CATEGORIAS_DESPESA}}"}, {"{{CATEGORIAS_RECEITA}}"} e {"{{INTENCOES}}"} para inserir as listas
          correspondentes. O texto da mensagem do usuário é anexado automaticamente ao final.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" variant="brand" disabled={pending}>
          {pending ? "Salvando..." : "Salvar configurações"}
        </Button>

        <Button
          type="submit"
          variant="outline"
          formAction={restaurarConfiguracaoIA}
          onClick={(event) => {
            if (!window.confirm("Restaurar todos os campos para os valores padrão do sistema?")) {
              event.preventDefault();
            }
          }}
        >
          Restaurar padrões
        </Button>
      </div>
    </form>
  );
}
