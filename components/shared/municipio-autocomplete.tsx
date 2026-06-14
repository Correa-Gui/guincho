"use client";

import * as React from "react";
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
  ComboboxList,
  ComboboxPrimitive,
  ComboboxTrigger,
} from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import type { Municipio } from "@/lib/ibge";

let municipiosPromise: Promise<Municipio[]> | null = null;

function loadMunicipios(): Promise<Municipio[]> {
  if (!municipiosPromise) {
    municipiosPromise = fetch("/ibge-municipios.json").then((res) => res.json());
  }
  return municipiosPromise;
}

export type MunicipioSelecionado = {
  cidade: string;
  uf: string;
  ibge: string;
  lat: number;
  lon: number;
};

function toLabel(municipio: Municipio) {
  return `${municipio.nome} - ${municipio.uf}`;
}

export function MunicipioAutocomplete({
  id,
  label,
  namePrefix,
  defaultValue,
  onChange,
}: {
  id: string;
  label: string;
  namePrefix: string;
  defaultValue?: MunicipioSelecionado | null;
  onChange?: (value: MunicipioSelecionado | null) => void;
}) {
  const [municipios, setMunicipios] = React.useState<Municipio[]>([]);
  const [selecionado, setSelecionado] = React.useState<Municipio | null>(
    defaultValue
      ? {
          ibge: defaultValue.ibge,
          nome: defaultValue.cidade,
          uf: defaultValue.uf,
          lat: defaultValue.lat,
          lon: defaultValue.lon,
        }
      : null,
  );

  React.useEffect(() => {
    loadMunicipios().then(setMunicipios);
  }, []);

  const filter = ComboboxPrimitive.useFilter();

  function handleChange(value: Municipio | null) {
    setSelecionado(value);
    onChange?.(
      value
        ? { cidade: value.nome, uf: value.uf, ibge: value.ibge, lat: value.lat, lon: value.lon }
        : null,
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Combobox
        items={municipios}
        value={selecionado}
        onValueChange={(value) => handleChange(value as Municipio | null)}
        itemToStringLabel={(municipio: Municipio) => toLabel(municipio)}
        isItemEqualToValue={(item: Municipio, value: Municipio) => item.ibge === value.ibge}
        filter={(item: Municipio, query, itemToString) => filter.contains(item, query, itemToString)}
        limit={5}
      >
        <ComboboxInputGroup>
          <ComboboxInput id={id} placeholder="Buscar cidade..." />
          <ComboboxTrigger />
        </ComboboxInputGroup>
        <ComboboxContent>
          <ComboboxEmpty>Nenhum município encontrado.</ComboboxEmpty>
          <ComboboxList>
            <ComboboxCollection>
              {(municipio: Municipio) => (
                <ComboboxItem key={municipio.ibge} value={municipio}>
                  {toLabel(municipio)}
                </ComboboxItem>
              )}
            </ComboboxCollection>
          </ComboboxList>
        </ComboboxContent>
      </Combobox>

      <input type="hidden" name={`${namePrefix}_cidade`} value={selecionado?.nome ?? ""} />
      <input type="hidden" name={`${namePrefix}_uf`} value={selecionado?.uf ?? ""} />
      <input type="hidden" name={`${namePrefix}_ibge`} value={selecionado?.ibge ?? ""} />
      <input type="hidden" name={`${namePrefix}_lat`} value={selecionado?.lat ?? ""} />
      <input type="hidden" name={`${namePrefix}_lon`} value={selecionado?.lon ?? ""} />
    </div>
  );
}
