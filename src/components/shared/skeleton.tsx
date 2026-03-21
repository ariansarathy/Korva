/**
 * Composable skeleton primitives for loading states.
 * Used by loading.tsx files across the app.
 */

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-surface-hover ${className}`} />
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  const widths = ["w-full", "w-5/6", "w-4/6", "w-3/4", "w-2/3"];
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3 ${widths[i % widths.length]}`}
        />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-7 w-28" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

export function SkeletonChart() {
  const barHeights = [
    "h-[45%]", "h-[60%]", "h-[50%]", "h-[70%]", "h-[55%]", "h-[80%]",
    "h-[65%]", "h-[75%]", "h-[85%]", "h-[60%]", "h-[70%]", "h-[90%]",
  ];
  return (
    <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
      <Skeleton className="h-4 w-32" />
      <div className="flex items-end gap-2 h-48">
        {barHeights.map((h, i) => (
          <div key={i} className={`flex-1 ${h}`}>
            <Skeleton className="h-full w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonTable({
  rows = 5,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      {/* Header */}
      <div className="flex gap-4 border-b border-border px-5 py-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, row) => (
        <div
          key={row}
          className="flex gap-4 border-b border-border px-5 py-3 last:border-b-0"
        >
          {Array.from({ length: columns }).map((_, col) => (
            <Skeleton key={col} className="h-3 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonSection() {
  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <div className="mb-4 flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-2.5 w-40" />
        </div>
      </div>
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Chart + Insights row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SkeletonChart />
        </div>
        <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
          <Skeleton className="h-4 w-24" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SkeletonTable rows={5} columns={3} />
        <SkeletonTable rows={5} columns={3} />
      </div>
    </div>
  );
}

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* Section cards */}
      <SkeletonSection />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SkeletonSection />
        <SkeletonSection />
      </div>

      <SkeletonSection />
    </div>
  );
}

export function TablePageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* Search / filters */}
      <div className="flex gap-3">
        <Skeleton className="h-9 flex-1 max-w-sm rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>

      {/* Table */}
      <SkeletonTable rows={8} columns={5} />
    </div>
  );
}

export function ReportsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Report type cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Reports table */}
      <SkeletonTable rows={5} columns={4} />
    </div>
  );
}
