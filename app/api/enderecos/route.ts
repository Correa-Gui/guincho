import { NextResponse } from "next/server";
import { buscarEnderecos } from "@/lib/enderecos";

/** Autocomplete de endereços (Nominatim) pro cadastro de viagem. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (q.length < 3) {
    return NextResponse.json([]);
  }

  const sugestoes = await buscarEnderecos(q);
  return NextResponse.json(sugestoes);
}
