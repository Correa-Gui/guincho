import { createClient } from "@/lib/supabase/server";

const OSRM_BASE_URL = process.env.OSRM_BASE_URL || "https://router.project-osrm.org";

export type Rota = {
  distanciaKm: number;
  duracaoMin: number;
  pedagioEstimado: number | null;
  fonte: string;
};

export type PontoRota = { ibge: string; lat: number; lon: number };

/**
 * Distância/duração entre dois municípios: cache em `rotas_cache` primeiro,
 * depois calcula via OSRM (driving) e grava no cache.
 * `pedagioEstimado` ainda não tem fonte de dados — fica null até a fase
 * de automações financeiras integrar um provedor de pedágio.
 */
export async function getRota(origem: PontoRota, destino: PontoRota): Promise<Rota | null> {
  if (origem.ibge === destino.ibge) {
    return { distanciaKm: 0, duracaoMin: 0, pedagioEstimado: 0, fonte: "mesmo-municipio" };
  }

  const supabase = await createClient();

  const { data: cached } = await supabase
    .from("rotas_cache")
    .select("distancia_km, duracao_min, pedagio_estimado, fonte")
    .eq("origem_ibge", origem.ibge)
    .eq("destino_ibge", destino.ibge)
    .maybeSingle();

  if (cached) {
    return {
      distanciaKm: cached.distancia_km,
      duracaoMin: cached.duracao_min,
      pedagioEstimado: cached.pedagio_estimado,
      fonte: cached.fonte,
    };
  }

  const rota = await calcularRotaOsrm(origem, destino);
  if (!rota) return null;

  await supabase.from("rotas_cache").insert({
    origem_ibge: origem.ibge,
    destino_ibge: destino.ibge,
    distancia_km: rota.distanciaKm,
    duracao_min: rota.duracaoMin,
    pedagio_estimado: rota.pedagioEstimado,
    fonte: rota.fonte,
  });

  return rota;
}

async function calcularRotaOsrm(origem: PontoRota, destino: PontoRota): Promise<Rota | null> {
  const url = `${OSRM_BASE_URL}/route/v1/driving/${origem.lon},${origem.lat};${destino.lon},${destino.lat}?overview=false`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "GuinchoFin/1.0 (contato@guinchofin.app)" },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      code: string;
      routes?: { distance: number; duration: number }[];
    };
    const route = data.routes?.[0];
    if (data.code !== "Ok" || !route) return null;

    return {
      distanciaKm: Math.round((route.distance / 1000) * 10) / 10,
      duracaoMin: Math.round(route.duration / 60),
      pedagioEstimado: null,
      fonte: "osrm",
    };
  } catch {
    return null;
  }
}
