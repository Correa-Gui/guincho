import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@/lib/supabase/server";

export type Municipio = {
  ibge: string;
  nome: string;
  uf: string;
  lat: number;
  lon: number;
};

let cache: Municipio[] | null = null;

async function loadMunicipios(): Promise<Municipio[]> {
  if (!cache) {
    const filePath = path.join(process.cwd(), "public", "ibge-municipios.json");
    const raw = await readFile(filePath, "utf-8");
    cache = JSON.parse(raw) as Municipio[];
  }
  return cache;
}

export async function getMunicipios(): Promise<Municipio[]> {
  return loadMunicipios();
}

export async function findMunicipioPorIbge(ibge: string): Promise<Municipio | undefined> {
  const municipios = await loadMunicipios();
  return municipios.find((m) => m.ibge === ibge);
}

/**
 * Coordenadas de um município: dataset estático primeiro, depois cache em
 * `municipios_coords_fallback`, e por último geocodifica via Nominatim (OSM).
 * O dataset atual cobre os 5.570 municípios, então o fallback só entra em
 * jogo se o IBGE incluir um novo município antes da base ser atualizada.
 */
export async function getCoordsComFallback(
  ibge: string,
  nome: string,
  uf: string,
): Promise<{ lat: number; lon: number; fonte: string } | null> {
  const local = await findMunicipioPorIbge(ibge);
  if (local) return { lat: local.lat, lon: local.lon, fonte: "ibge-municipios-brasileiros" };

  const supabase = await createClient();

  const { data: cached } = await supabase
    .from("municipios_coords_fallback")
    .select("lat, lon, fonte")
    .eq("ibge_codigo", ibge)
    .maybeSingle();
  if (cached) return cached;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("city", nome);
  url.searchParams.set("state", uf);
  url.searchParams.set("country", "Brazil");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "GuinchoFin/1.0 (contato@guinchofin.app)" },
    });
    if (!res.ok) return null;

    const results = (await res.json()) as { lat: string; lon: string }[];
    const first = results[0];
    if (!first) return null;

    const lat = Number(first.lat);
    const lon = Number(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

    await supabase
      .from("municipios_coords_fallback")
      .insert({ ibge_codigo: ibge, lat, lon, fonte: "nominatim" });

    return { lat, lon, fonte: "nominatim" };
  } catch {
    return null;
  }
}
