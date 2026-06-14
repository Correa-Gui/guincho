// Gera public/ibge-municipios.json a partir do dataset estático
// kelvins/municipios-brasileiros (MIT) — codigo_ibge, nome, UF, lat, lon.
// Rodar manualmente quando precisar atualizar a base: node scripts/fetch-municipios.mjs

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const MUNICIPIOS_URL =
  "https://raw.githubusercontent.com/kelvins/municipios-brasileiros/main/json/municipios.json";
const ESTADOS_URL =
  "https://raw.githubusercontent.com/kelvins/municipios-brasileiros/main/json/estados.json";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "..", "public", "ibge-municipios.json");

const [municipios, estados] = await Promise.all([
  fetch(MUNICIPIOS_URL).then((r) => r.json()),
  fetch(ESTADOS_URL).then((r) => r.json()),
]);

const ufPorCodigo = new Map(estados.map((e) => [e.codigo_uf, e.uf]));

const data = municipios
  .map((m) => ({
    ibge: String(m.codigo_ibge),
    nome: m.nome,
    uf: ufPorCodigo.get(m.codigo_uf) ?? "",
    lat: m.latitude,
    lon: m.longitude,
  }))
  .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

await writeFile(outPath, JSON.stringify(data), "utf-8");
console.log(`Gerado ${outPath} com ${data.length} municípios.`);
