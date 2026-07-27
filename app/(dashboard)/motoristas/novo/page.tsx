import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MotoristaForm } from "@/components/motoristas/motorista-form";
import { createMotorista } from "../actions";

export default function NovoMotoristaPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Novo motorista
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Cadastre um motorista da frota.</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Dados do motorista</CardTitle>
        </CardHeader>
        <CardContent>
          <MotoristaForm action={createMotorista} />
        </CardContent>
      </Card>
    </div>
  );
}
