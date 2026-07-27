"use client";

import { useMemo, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
import topology from "@/lib/data/brasil-uf.json";
import { cn } from "@/lib/utils";

const UF_NOME: Record<string, string> = {
  AC: "Acre",
  AL: "Alagoas",
  AM: "Amazonas",
  AP: "Amapá",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MG: "Minas Gerais",
  MS: "Mato Grosso do Sul",
  MT: "Mato Grosso",
  PA: "Pará",
  PB: "Paraíba",
  PE: "Pernambuco",
  PI: "Piauí",
  PR: "Paraná",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RO: "Rondônia",
  RR: "Roraima",
  RS: "Rio Grande do Sul",
  SC: "Santa Catarina",
  SE: "Sergipe",
  SP: "São Paulo",
  TO: "Tocantins",
};

const WIDTH = 520;
const HEIGHT = 480;

export function BrasilMapaViagens({ contagens }: { contagens: Record<string, number> }) {
  const [hover, setHover] = useState<string | null>(null);

  const { geojson, path } = useMemo(() => {
    const objectKey = Object.keys(topology.objects)[0];
    const geojson = feature(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      topology as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (topology as any).objects[objectKey],
    ) as unknown as FeatureCollection<Geometry, { sigla: string }>;

    const projection = geoMercator().fitSize([WIDTH, HEIGHT], geojson);
    const path = geoPath(projection);

    return { geojson, path };
  }, []);

  const max = Math.max(1, ...Object.values(contagens));

  function corEstado(sigla: string) {
    const valor = contagens[sigla] ?? 0;
    if (valor === 0) return "var(--muted)";
    const intensidade = 0.18 + 0.82 * (valor / max);
    return `color-mix(in srgb, var(--brand) ${Math.round(intensidade * 100)}%, var(--muted) ${Math.round((1 - intensidade) * 100)}%)`;
  }

  const ativo = hover ? { sigla: hover, nome: UF_NOME[hover] ?? hover, total: contagens[hover] ?? 0 } : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" role="img" aria-label="Mapa do Brasil com viagens por estado">
        {geojson.features.map((featureItem) => {
          const sigla = featureItem.properties.sigla;
          return (
            <path
              key={sigla}
              d={path(featureItem) ?? undefined}
              fill={corEstado(sigla)}
              stroke="var(--card)"
              strokeWidth={1}
              className={cn(
                "cursor-pointer transition-[fill,opacity] duration-150",
                hover && hover !== sigla && "opacity-60",
              )}
              onMouseEnter={() => setHover(sigla)}
              onMouseLeave={() => setHover((current) => (current === sigla ? null : current))}
            />
          );
        })}
      </svg>

      <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-border bg-card/95 px-3 py-2 text-xs shadow-sm">
        {ativo ? (
          <>
            <div className="font-semibold text-foreground">{ativo.nome}</div>
            <div className="text-muted-foreground">
              {ativo.total} {ativo.total === 1 ? "viagem" : "viagens"}
            </div>
          </>
        ) : (
          <div className="text-muted-foreground">Passe o mouse sobre um estado</div>
        )}
      </div>
    </div>
  );
}
