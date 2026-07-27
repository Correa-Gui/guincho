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
  ComboboxTrigger,
} from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import type { EnderecoSugestao } from "@/lib/enderecos";

const DEBOUNCE_MS = 350;

/**
 * Autocomplete de endereço (Nominatim, via /api/enderecos). Diferente do
 * `MunicipioAutocomplete` (lista fixa local), busca sugestões assíncronas
 * conforme o usuário digita. O texto do endereço vai num input hidden
 * `name={namePrefix}`; ao selecionar uma sugestão com município reconhecido,
 * `onSelect` é chamado para o form atualizar cidade/UF/IBGE/lat/lon.
 */
export function EnderecoAutocomplete({
  id,
  label,
  namePrefix,
  defaultValue,
  onSelect,
}: {
  id: string;
  label: string;
  namePrefix: string;
  defaultValue?: string | null;
  onSelect?: (sugestao: EnderecoSugestao) => void;
}) {
  const [itens, setItens] = React.useState<EnderecoSugestao[]>([]);
  const [selecionado, setSelecionado] = React.useState<EnderecoSugestao | null>(null);
  const [inputValue, setInputValue] = React.useState(defaultValue ?? "");
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function buscar(query: string) {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (query.trim().length < 3) {
      setItens([]);
      return;
    }

    timeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/enderecos?q=${encodeURIComponent(query)}`);
        if (!res.ok) return;
        setItens((await res.json()) as EnderecoSugestao[]);
      } catch {
        // falha de rede: mantém lista atual
      }
    }, DEBOUNCE_MS);
  }

  function handleInputValueChange(value: string) {
    setInputValue(value);
    buscar(value);
  }

  function handleValueChange(value: EnderecoSugestao | null) {
    setSelecionado(value);
    if (value) {
      setInputValue(value.endereco);
      setItens([]);
      onSelect?.(value);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Combobox
        items={itens}
        value={selecionado}
        inputValue={inputValue}
        onInputValueChange={handleInputValueChange}
        onValueChange={(value) => handleValueChange(value as EnderecoSugestao | null)}
        itemToStringLabel={(item: EnderecoSugestao) => item.label}
        isItemEqualToValue={(item: EnderecoSugestao, value: EnderecoSugestao) => item.label === value.label}
        filter={null}
      >
        <ComboboxInputGroup>
          <ComboboxInput id={id} placeholder="Buscar endereço..." />
          <ComboboxTrigger />
        </ComboboxInputGroup>
        <ComboboxContent>
          <ComboboxEmpty>Nenhum endereço encontrado.</ComboboxEmpty>
          <ComboboxList>
            <ComboboxCollection>
              {(item: EnderecoSugestao) => (
                <ComboboxItem key={item.label} value={item}>
                  {item.label}
                </ComboboxItem>
              )}
            </ComboboxCollection>
          </ComboboxList>
        </ComboboxContent>
      </Combobox>

      <input type="hidden" name={namePrefix} value={inputValue} />
    </div>
  );
}
