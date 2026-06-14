export function parseValor(raw: string): number | null {
  const normalized = raw.trim().replace(/\./g, "").replace(",", ".");
  if (normalized === "") return 0;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}
