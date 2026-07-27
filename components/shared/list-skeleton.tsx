import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PageHeaderSkeleton() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-8 w-36" />
    </div>
  );
}

export function ListSkeleton({ rows = 6, title }: { rows?: number; title?: boolean }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 px-4 py-4">
        {title ? <Skeleton className="h-5 w-40" /> : null}
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}
