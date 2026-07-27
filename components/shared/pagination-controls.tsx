import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PaginationControls({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3 sm:px-6">
      <span className="text-xs text-muted-foreground">
        Página {page} de {totalPages}
      </span>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Button variant="outline" size="sm" render={<Link href={buildHref(page - 1)} />} nativeButton={false}>
            <ChevronLeft />
            Anterior
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft />
            Anterior
          </Button>
        )}
        {page < totalPages ? (
          <Button variant="outline" size="sm" render={<Link href={buildHref(page + 1)} />} nativeButton={false}>
            Próxima
            <ChevronRight />
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Próxima
            <ChevronRight />
          </Button>
        )}
      </div>
    </div>
  );
}
