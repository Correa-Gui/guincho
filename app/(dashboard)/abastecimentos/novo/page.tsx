import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AbastecimentoForm } from "@/components/abastecimentos/abastecimento-form";
import { createClient } from "@/lib/supabase/server";
import { createAbastecimento } from "../actions";

export default async function NovoAbastecimentoPage() {
  const supabase = await createClient();

  const [{ data: veiculos }, { data: motoristas }] = await Promise.all([
    supabase.from("veiculos_frota").select("id, placa, modelo").order("placa"),
    supabase.from("motoristas").select("id, nome").order("nome"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Novo abastecimento
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registre um abastecimento da frota.
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Dados do abastecimento</CardTitle>
        </CardHeader>
        <CardContent>
          <AbastecimentoForm
            action={createAbastecimento}
            veiculos={veiculos ?? []}
            motoristas={motoristas ?? []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
