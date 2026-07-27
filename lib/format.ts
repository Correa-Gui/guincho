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
