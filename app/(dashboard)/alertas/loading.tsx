import { ListSkeleton, PageHeaderSkeleton } from "@/components/shared/list-skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton />
      <ListSkeleton rows={5} />
    </div>
  );
}
