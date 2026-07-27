"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFormFeedback } from "@/components/shared/use-form-feedback";
import { EnderecoAutocomplete } from "@/components/shared/endereco-autocomplete";
import type { EnderecoSugestao } from "@/lib/enderecos";
import { salvarParametrosViagem } from "@/app/(dashboard)/admin/configuracoes/actions";

type BaseEndereco = {
  endereco: string;
  cidade: string;
  uf: string;
  ibge: string;
  lat: number;
  lon: number;
};

export function ParametrosViagemForm({
  tarifaKmPadrao,
  precoCombustivelPadrao,
  base,
}: {
  tarifaKmPadrao: number;
  precoCombustivelPadrao: number;
  base: BaseEndereco | null;
}) {
  const [state, formAction, pending] = useActionState(salvarParametrosViagem, {});
  const [baseMunicipio, setBaseMunicipio] = useState<{
    cidade: string;
    uf: string;
    ibge: string;
    lat: number;
    lon: number;
  } | null>(base ? { cidade: base.cidade, uf: base.uf, ibge: base.ibge, lat: base.lat, lon: base.lon } : null);

  useFormFeedback(state, { successMessage: "Parâmetros salvos com sucesso." });

  function handleBaseSelect(sugestao: EnderecoSugestao) {
    if (!sugestao.ibge || !sugestao.cidade || !sugestao.uf) return;
    setBaseMunicipio({
      cidade: sugestao.cidade,
      uf: sugestao.uf,
      ibge: sugestao.ibge,
      lat: sugestao.lat,
      lon: sugestao.lon,
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="tarifa_km_padrao">Tarifa por km (R$)</Label>
          <Input
            id="tarifa_km_padrao"
            name="tarifa_km_padrao"
            type="text"
            inputMode="decimal"
            defaultValue={tarifaKmPadrao.toFixed(2).replace(".", ",")}
          />
          <p className="text-xs text-muted-foreground">
            Valor cobrado por km rodado, usado na sugestão de preço da viagem.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="preco_combustivel_padrao">Preço do combustível (R$/l)</Label>
          <Input
            id="preco_combustivel_padrao"
            name="preco_combustivel_padrao"
            type="text"
            inputMode="decimal"
            defaultValue={precoCombustivelPadrao.toFixed(2).replace(".", ",")}
          />
          <p className="text-xs text-muted-foreground">
            Usado junto com o consumo médio do veículo (cadastro da frota) para estimar o custo
            de combustível da viagem.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <EnderecoAutocomplete
          id="base_endereco"
          label="Endereço da base (garagem)"
          namePrefix="base_endereco"
          defaultValue={base?.endereco}
          onSelect={handleBaseSelect}
        />
        <p className="text-xs text-muted-foreground">
          Usado pra somar o trajeto de volta do guincho até a base no cálculo da viagem
          (distância, pedágio e combustível estimados).
        </p>
      </div>

      <input type="hidden" name="base_cidade" value={baseMunicipio?.cidade ?? ""} />
      <input type="hidden" name="base_uf" value={baseMunicipio?.uf ?? ""} />
      <input type="hidden" name="base_ibge" value={baseMunicipio?.ibge ?? ""} />
      <input type="hidden" name="base_lat" value={baseMunicipio?.lat ?? ""} />
      <input type="hidden" name="base_lon" value={baseMunicipio?.lon ?? ""} />

      <Button type="submit" variant="brand" disabled={pending} className="self-start">
        {pending ? "Salvando..." : "Salvar parâmetros"}
      </Button>
    </form>
  );
}
