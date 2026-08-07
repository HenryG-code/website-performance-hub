import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-shimmer rounded-md bg-elevated", className)}
      aria-hidden
      {...props}
    />
  );
}

/** Card-shaped placeholder used by route-level `loading.tsx` files. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-card border border-border bg-card p-5 space-y-3",
        className,
      )}
    >
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-2 w-full" />
    </div>
  );
}

export function SkeletonTable({ rows = 6 }: { rows?: number }) {
  return (
    <div className="rounded-card border border-border bg-card">
      <div className="border-b border-border px-5 py-4">
        <Skeleton className="h-3.5 w-40" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 px-5 py-4">
            <Skeleton className="size-9 rounded-lg" />
            <Skeleton className="h-3 w-40" />
            <Skeleton className="ml-auto h-3 w-16" />
            <Skeleton className="hidden h-3 w-20 sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
