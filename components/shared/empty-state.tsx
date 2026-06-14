import Link from "next/link";
import type { ComponentType } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function EmptyStateContent({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-brand/10">
        <Icon className="size-6 text-brand-strong" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actionLabel && actionHref ? (
        <Button variant="brand" size="sm" render={<Link href={actionHref} />} className="mt-1">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  bare,
  className,
  ...props
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  bare?: boolean;
  className?: string;
}) {
  if (bare) {
    return (
      <div className={cn("flex justify-center px-6 py-10", className)}>
        <EmptyStateContent {...props} />
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="flex justify-center py-10">
        <EmptyStateContent {...props} />
      </CardContent>
    </Card>
  );
}
