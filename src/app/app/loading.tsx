export default function AppLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <div className="h-4 w-24 animate-pulse rounded-md bg-black/[0.06]" />
        <div className="h-9 w-56 animate-pulse rounded-md bg-black/[0.06]" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded-md bg-black/[0.04]" />
      </div>
      <div className="space-y-3">
        <div className="h-24 animate-pulse rounded-[16px] border border-[var(--lc-line)] bg-lc-surface" />
        <div className="h-24 animate-pulse rounded-[16px] border border-[var(--lc-line)] bg-lc-surface" />
        <div className="h-24 animate-pulse rounded-[16px] border border-[var(--lc-line)] bg-lc-surface" />
      </div>
    </div>
  );
}
