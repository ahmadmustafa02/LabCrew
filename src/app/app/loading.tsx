import { PageHeaderSkeleton, CardListSkeleton } from "@/components/ui/skeleton";

export default function AppLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <PageHeaderSkeleton />
      <CardListSkeleton count={3} />
    </div>
  );
}
