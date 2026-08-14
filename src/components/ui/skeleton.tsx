import { cn } from "@/lib/cn";

export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn("lc-skel rounded-[10px]", className)}
      style={style}
      aria-hidden
    />
  );
}

export function PageHeaderSkeleton({
  titleWidth = "w-56",
}: {
  titleWidth?: string;
}) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className={cn("h-9", titleWidth)} />
      <Skeleton className="h-4 w-80 max-w-full" />
    </div>
  );
}

export function CardListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-[88px] rounded-[16px] border border-[var(--lc-line)] bg-lc-surface"
          style={{ animationDelay: `${i * 90}ms` }}
        />
      ))}
    </div>
  );
}

export function StatRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-[88px] rounded-[14px] border border-[var(--lc-line)] bg-lc-surface"
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  );
}

export function MissionControlSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeaderSkeleton titleWidth="w-48" />
        <Skeleton className="h-11 w-40 rounded-[10px]" />
      </div>
      <StatRowSkeleton />
      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <Skeleton className="min-h-[320px] rounded-[16px] border border-[var(--lc-line)] bg-lc-surface" />
        <div className="space-y-6">
          <Skeleton className="min-h-[200px] rounded-[16px] border border-[var(--lc-line)] bg-lc-surface" />
          <Skeleton className="min-h-[140px] rounded-[16px] border border-[var(--lc-line)] bg-lc-surface" />
        </div>
      </div>
    </div>
  );
}

export function MessagesShellSkeleton() {
  return (
    <div
      className="flex h-[min(70vh,640px)] overflow-hidden rounded-[16px] border border-[var(--lc-line)] bg-lc-surface"
      aria-busy="true"
      aria-label="Loading messages"
    >
      <aside className="w-[min(40%,280px)] space-y-2 border-r border-[var(--lc-line)] p-3">
        <Skeleton className="h-3 w-16" />
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-[10px]" />
        ))}
      </aside>
      <section className="flex min-w-0 flex-1 flex-col p-4">
        <Skeleton className="mb-4 h-5 w-40" />
        <div className="mt-auto space-y-3">
          <Skeleton className="ml-auto h-10 w-[55%] rounded-[16px]" />
          <Skeleton className="h-10 w-[48%] rounded-[16px]" />
          <Skeleton className="ml-auto h-10 w-[40%] rounded-[16px]" />
        </div>
      </section>
    </div>
  );
}
