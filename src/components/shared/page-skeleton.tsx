import { Skeleton, SkeletonCard, SkeletonTable } from "@/components/ui/skeleton";

/**
 * Route-level loading skeletons. Each variant mirrors the layout of the page it
 * stands in for, so navigation doesn't shift content around once data arrives.
 */
export function PageSkeleton({
  variant = "table",
}: {
  variant?: "dashboard" | "table" | "detail" | "report" | "settings";
}) {
  return (
    <div className="space-y-6" aria-busy role="status" aria-label="Loading">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>

      {variant === "dashboard" ? (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} className="h-52" />
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} className="h-40" />
            ))}
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            <SkeletonCard className="h-80 xl:col-span-2" />
            <SkeletonCard className="h-80" />
          </div>
        </>
      ) : null}

      {variant === "table" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-16 w-full rounded-card" />
          <SkeletonTable rows={7} />
        </>
      ) : null}

      {variant === "detail" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCard key={i} className="h-28" />
            ))}
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            <SkeletonCard className="h-80 xl:col-span-2" />
            <SkeletonCard className="h-80" />
          </div>
        </>
      ) : null}

      {variant === "report" ? <SkeletonCard className="h-[42rem]" /> : null}

      {variant === "settings" ? (
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <SkeletonCard className="h-72" />
            <SkeletonCard className="h-96" />
          </div>
          <div className="space-y-6">
            <SkeletonCard className="h-72" />
            <SkeletonCard className="h-56" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
