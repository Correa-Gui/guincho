"use client";

import { useActionState, useRef, useState } from "react";
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
import {
  MunicipioAutocomplete,
  type MunicipioSelecionado,
} from "@/components/shared/municipio-autocomplete";
import { EnderecoAutocomplete } from "@/components/shared/endereco-autocomplete";
import type { EnderecoSugestao } from "@/lib/enderecos";
import { formatCurrency, todayInputValue } from "@/lib/format";
import { VIAGEM_STATUS_LABEL, type Motorista, type VeiculoFrota, type Viagem } from "@/lib/types";
import {
  sugerirRota,
  type SugestaoRota,
  type ViagemFormState,
} from "@/app/(dashboard)/viagens/actions";

type Action = (prev: ViagemFormState, formData: FormData) => Promise<ViagemFormState>;

export function ViagemForm({
  action,
  viagem,
  motoristas,
  veiculos,
}: {
  action: Action;
  viagem?: Viagem;
  motoristas: Motorista[];
  veiculos: VeiculoFrota[];
}) {
  const [state, formAction, pending] = useActionState(action, {});

  useFormFeedback(state, {
    successMessage: "Viagem salva com sucesso.",
    redirectTo: state.id ? `/viagens/${state.id}` : "/viagens",
  });

  const [origemMun, setOrigemMun] = useState<MunicipioSelecionado | null>(
    viagem?.origem_ibge
      ? {
          cidade: viagem.origem_cidade ?? "",
          uf: viagem.origem_uf ?? "",
          ibge: viagem.origem_ibge,
          lat: viagem.origem_lat ?? 0,
          lon: viagem.origem_lon ?? 0,
        }
      : null,
  );
  const [destinoMun, setDestinoMun] = useState<MunicipioSelecionado | null>(
    viagem?.destino_ibge
      ? {
          cidade: viagem.destino_cidade ?? "",
          uf: viagem.destino_uf ?? "",
          ibge: viagem.destino_ibge,
          lat: viagem.destino_lat ?? 0,
          lon: viagem.destino_lon ?? 0,
        }
      : null,
  );
  const [sugestao, setSugestao] = useState<SugestaoRota | null>(null);
  const [carregandoSugestao, setCarregandoSugestao] = useState(false);
  const [veiculoId, setVeiculoId] = useState(viagem?.veiculo_id ?? "");
  const valorInputRef = useRef<HTMLInputElement>(null);
  const consultaIdRef = useRef(0);

  function buscarSugestao(
    origem: MunicipioSelecionado | null,
    destino: MunicipioSelecionado | null,
    veiculo: string,
  ) {
    if (!origem || !destino) {
      setSugestao(null);
      return;
    }

    const consultaId = ++consultaIdRef.current;
    setCarregandoSugestao(true);
    sugerirRota(
      { ibge: origem.ibge, lat: origem.lat, lon: origem.lon },
      { ibge: destino.ibge, lat: destino.lat, lon: destino.lon },
      veiculo || null,
    ).then((resultado) => {
      if (consultaIdRef.current !== consultaId) return;
      setSugestao(resultado);
      setCarregandoSugestao(false);
    });
  }

  function handleOrigemChange(value: MunicipioSelecionado | null) {
    setOrigemMun(value);
    buscarSugestao(value, destinoMun, veiculoId);
  }

  function handleDestinoChange(value: MunicipioSelecionado | null) {
    setDestinoMun(value);
    buscarSugestao(origemMun, value, veiculoId);
  }

  function handleVeiculoChange(value: string) {
    setVeiculoId(value);
    buscarSugestao(origemMun, destinoMun, value);
  }

  function handleEnderecoOrigemSelect(sugestao: EnderecoSugestao) {
    if (!sugestao.ibge || !sugestao.cidade || !sugestao.uf) return;
    handleOrigemChange({ cidade: sugestao.cidade, uf: sugestao.uf, ibge: sugestao.ibge, lat: sugestao.lat, lon: sugestao.lon });
  }

  function handleEnderecoDestinoSelect(sugestao: EnderecoSugestao) {
    if (!sugestao.ibge || !sugestao.cidade || !sugestao.uf) return;
    handleDestinoChange({ cidade: sugestao.cidade, uf: sugestao.uf, ibge: sugestao.ibge, lat: sugestao.lat, lon: sugestao.lon });
  }

  function usarValorSugerido() {
    if (!sugestao || !valorInputRef.current) return;
    valorInputRef.current.value = sugestao.precoSugerido.toFixed(2).replace(".", ",");
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="motorista_id">Motorista</Label>
          <Select
            name="motorista_id"
            defaultValue={viagem?.motorista_id ?? ""}
            items={{ "": "Nenhum", ...Object.fromEntries(motoristas.map((m) => [m.id, m.nome])) }}
          >
            <SelectTrigger id="motorista_id" className="w-full">
              <SelectValue placeholder="Selecione um motorista" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Nenhum</SelectItem>
              {motoristas.map((motorista) => (
                <SelectItem key={motorista.id} value={motorista.id}>
                  {motorista.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="veiculo_id">Veículo</Label>
          <Select
            name="veiculo_id"
            defaultValue={viagem?.veiculo_id ?? ""}
            onValueChange={(value) => handleVeiculoChange(value as string)}
            items={{
              "": "Nenhum",
              ...Object.fromEntries(
                veiculos.map((v) => [v.id, v.modelo ? `${v.placa} — ${v.modelo}` : v.placa]),
              ),
            }}
          >
            <SelectTrigger id="veiculo_id" className="w-full">
              <SelectValue placeholder="Selecione um veículo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Nenhum</SelectItem>
              {veiculos.map((veiculo) => (
                <SelectItem key={veiculo.id} value={veiculo.id}>
                  {veiculo.placa}
                  {veiculo.modelo ? ` — ${veiculo.modelo}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="data">Data</Label>
        <Input
          id="data"
          name="data"
          type="date"
          defaultValue={viagem?.data ?? todayInputValue()}
          required
          className="sm:max-w-xs"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MunicipioAutocomplete
          id="origem_cidade"
          label="Cidade de origem"
          namePrefix="origem"
          defaultValue={origemMun}
          onChange={handleOrigemChange}
        />

        <MunicipioAutocomplete
          id="destino_cidade"
          label="Cidade de destino"
          namePrefix="destino"
          defaultValue={destinoMun}
          onChange={handleDestinoChange}
        />
      </div>

      {origemMun && destinoMun && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
          {carregandoSugestao ? (
            <span className="text-muted-foreground">Calculando rota...</span>
          ) : sugestao ? (
            <>
              {sugestao.saidaBaseKm !== null && (
                <span className="text-muted-foreground">
                  Base → origem: <strong>{sugestao.saidaBaseKm} km</strong> · ~
                  {sugestao.saidaBaseDuracaoMin} min
                  {sugestao.pedagioSaidaEstimado !== null && (
                    <> · pedágio est. {formatCurrency(sugestao.pedagioSaidaEstimado)}</>
                  )}
                </span>
              )}
              <span>
                Origem → destino: <strong>{sugestao.distanciaKm} km</strong> · ~
                {sugestao.duracaoMin} min
                {sugestao.pedagioEstimado !== null && (
                  <> · pedágio est. {formatCurrency(sugestao.pedagioEstimado)}</>
                )}
              </span>
              {sugestao.retornoKm !== null && (
                <span className="text-muted-foreground">
                  Destino → base: <strong>{sugestao.retornoKm} km</strong> · ~
                  {sugestao.retornoDuracaoMin} min
                  {sugestao.pedagioRetornoEstimado !== null && (
                    <> · pedágio est. {formatCurrency(sugestao.pedagioRetornoEstimado)}</>
                  )}
                </span>
              )}
              {(sugestao.saidaBaseKm !== null || sugestao.retornoKm !== null) && (
                <span className="text-muted-foreground">
                  Trajeto total: <strong>{sugestao.distanciaTotalKm} km</strong>
                </span>
              )}
              {sugestao.custoCombustivelEstimado !== null && (
                <span>
                  Combustível est.:{" "}
                  <strong>{formatCurrency(sugestao.custoCombustivelEstimado)}</strong>
                </span>
              )}
              <span>Valor sugerido: <strong>{formatCurrency(sugestao.precoSugerido)}</strong></span>
              <Button type="button" size="sm" variant="outline" onClick={usarValorSugerido}>
                Usar valor sugerido
              </Button>
            </>
          ) : (
            <span className="text-muted-foreground">Não foi possível calcular a rota.</span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <EnderecoAutocomplete
          id="origem"
          label="Endereço de origem"
          namePrefix="origem"
          defaultValue={viagem?.origem}
          onSelect={handleEnderecoOrigemSelect}
        />

        <EnderecoAutocomplete
          id="destino"
          label="Endereço de destino"
          namePrefix="destino"
          defaultValue={viagem?.destino}
          onSelect={handleEnderecoDestinoSelect}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="valor">Valor (R$)</Label>
          <Input
            ref={valorInputRef}
            id="valor"
            name="valor"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            defaultValue={viagem ? viagem.valor.toFixed(2).replace(".", ",") : ""}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="status">Status</Label>
          <Select name="status" defaultValue={viagem?.status ?? "agendada"} items={VIAGEM_STATUS_LABEL}>
            <SelectTrigger id="status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(VIAGEM_STATUS_LABEL).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea
          id="observacoes"
          name="observacoes"
          placeholder="Detalhes do serviço, condições do veículo, etc."
          defaultValue={viagem?.observacoes ?? ""}
        />
      </div>

      <Button
        type="submit"
        variant="brand"
        disabled={pending}
        className="self-start"
      >
        {pending ? "Salvando..." : "Salvar viagem"}
      </Button>
    </form>
  );
}
