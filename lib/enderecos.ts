import { getMunicipios, type Municipio } from "@/lib/ibge";

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";
const USER_AGENT = "GuinchoFin/1.0 (contato@guinchofin.app)";

export type EnderecoSugestao = {
  label: string;
  endereco: string;
  cidade: string | null;
  uf: string | null;
  ibge: string | null;
  lat: number;
  lon: number;
};

export type LocalResolvido = {
  cidade: string | null;
  uf: string | null;
  ibge: string | null;
  lat: number | null;
  lon: number | null;
};

/** Nomes completos de UF (como retornados pelo Nominatim em `address.state`) -> sigla. */
const UF_POR_NOME: Record<string, string> = {
  acre: "AC",
  alagoas: "AL",
  amapa: "AP",
  amazonas: "AM",
  bahia: "BA",
  ceara: "CE",
  "distrito federal": "DF",
  "espirito santo": "ES",
  goias: "GO",
  maranhao: "MA",
  "mato grosso": "MT",
  "mato grosso do sul": "MS",
  "minas gerais": "MG",
  para: "PA",
  paraiba: "PB",
  parana: "PR",
  pernambuco: "PE",
  piaui: "PI",
  "rio de janeiro": "RJ",
  "rio grande do norte": "RN",
  "rio grande do sul": "RS",
  rondonia: "RO",
  roraima: "RR",
  "santa catarina": "SC",
  "sao paulo": "SP",
  sergipe: "SE",
  tocantins: "TO",
};

/** lowercase + remove acentos, pra comparar nomes de cidade/estado. */
export function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function ufDoNomeEstado(nomeEstado: string | undefined): string | null {
  if (!nomeEstado) return null;
  return UF_POR_NOME[normalizarTexto(nomeEstado)] ?? null;
}

/** Procura um município no dataset local pelo nome (e UF, se informada). */
export async function matchMunicipio(nomeCidade: string, uf?: string | null): Promise<Municipio | null> {
  const municipios = await getMunicipios();
  const nomeAlvo = normalizarTexto(nomeCidade);
  const ufAlvo = uf ? normalizarTexto(uf) : null;

  const candidatos = municipios.filter((m) => normalizarTexto(m.nome) === nomeAlvo);
  if (candidatos.length === 0) return null;
  if (candidatos.length === 1 || !ufAlvo) return candidatos[0];

  return candidatos.find((m) => normalizarTexto(m.uf) === ufAlvo) ?? candidatos[0];
}

type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
  };
};

async function buscarNominatim(query: string, limit: number): Promise<NominatimResult[]> {
  const url = new URL(`${NOMINATIM_BASE_URL}/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("countrycodes", "br");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("format", "json");

  try {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) return [];
    return (await res.json()) as NominatimResult[];
  } catch {
    return [];
  }
}

async function paraSugestao(resultado: NominatimResult): Promise<EnderecoSugestao | null> {
  const lat = Number(resultado.lat);
  const lon = Number(resultado.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const nomeCidade =
    resultado.address?.city ?? resultado.address?.town ?? resultado.address?.village ?? resultado.address?.municipality ?? null;
  const uf = ufDoNomeEstado(resultado.address?.state);

  const municipio = nomeCidade ? await matchMunicipio(nomeCidade, uf) : null;

  return {
    label: resultado.display_name,
    endereco: resultado.display_name,
    cidade: municipio?.nome ?? nomeCidade,
    uf: municipio?.uf ?? uf,
    ibge: municipio?.ibge ?? null,
    lat,
    lon,
  };
}

/** Sugestões de endereço (autocomplete) via Nominatim, com município/IBGE casado quando possível. */
export async function buscarEnderecos(query: string): Promise<EnderecoSugestao[]> {
  const resultados = await buscarNominatim(query, 5);
  const sugestoes = await Promise.all(resultados.map(paraSugestao));
  return sugestoes.filter((s): s is EnderecoSugestao => s !== null);
}

/**
 * Resolve um nome de local (ex: "Jaboticabal", vindo da interpretação de uma
 * mensagem de WhatsApp) pra município/coordenadas. Tenta o dataset local
 * primeiro (caso comum: é só o nome da cidade); cai pro Nominatim só se não
 * achar match.
 */
export async function resolverLocalizacao(nomeLocal: string): Promise<LocalResolvido | null> {
  const local = await matchMunicipio(nomeLocal);
  if (local) {
    return { cidade: local.nome, uf: local.uf, ibge: local.ibge, lat: local.lat, lon: local.lon };
  }

  const resultados = await buscarNominatim(`${nomeLocal}, Brasil`, 1);
  const primeiro = resultados[0];
  if (!primeiro) return null;

  const lat = Number(primeiro.lat);
  const lon = Number(primeiro.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const nomeCidade =
    primeiro.address?.city ?? primeiro.address?.town ?? primeiro.address?.village ?? primeiro.address?.municipality ?? null;
  const uf = ufDoNomeEstado(primeiro.address?.state);
  const municipio = nomeCidade ? await matchMunicipio(nomeCidade, uf) : null;

  return {
    cidade: municipio?.nome ?? nomeCidade,
    uf: municipio?.uf ?? uf,
    ibge: municipio?.ibge ?? null,
    lat,
    lon,
  };
}
