export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(value: string | Date): string {
  const date =
    typeof value === "string"
      ? new Date(value.length === 10 ? `${value}T00:00:00` : value)
      : value;
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

export function formatKm(value: number): string {
  return `${new Intl.NumberFormat("pt-BR").format(value)} km`;
}

export function formatDateTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Dias entre hoje e a data informada. Negativo quando a data já passou. */
export function diasEntre(value: string): number {
  const hoje = new Date(todayInputValue());
  const data = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return Math.round((data.getTime() - hoje.getTime()) / 86_400_000);
}

// Placa antiga (AAA0000) e Mercosul (AAA0A00) diferem só no 5º caractere
// (dígito na antiga, letra na Mercosul) — um único regex cobre as duas.
const REGEX_PLACA = /^[A-Z]{3}\d[A-Z0-9]\d{2}$/;

/** Normaliza (maiúsculas, sem espaço/hífen) e valida placa nos formatos antigo e Mercosul. */
export function validarPlaca(raw: string): { normalizada: string; valida: boolean } {
  const normalizada = raw.toUpperCase().replace(/[\s-]/g, "");
  return { normalizada, valida: REGEX_PLACA.test(normalizada) };
}
