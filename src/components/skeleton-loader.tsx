export function SkeletonLoader({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-3 rounded-lg border border-border animate-pulse"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </div>
          </div>
        </div>
      ))}
    </>
  )
}

export function EmailSkeletonLoader({ count = 5 }: { count?: number }) {
  return (
    <div className="p-2 space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-3 rounded-lg border border-border animate-pulse"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-4/5"></div>
              <div className="h-3 bg-muted rounded w-2/5"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function MessageSkeletonLoader({ count = 4 }: { count?: number }) {
  return (
    <div className="p-3 space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-3 rounded-lg border border-border animate-pulse"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-4 bg-muted rounded w-1/3"></div>
              <div className="h-3 bg-muted rounded w-16"></div>
            </div>
            <div className="h-5 bg-muted rounded w-3/4"></div>
            <div className="h-3 bg-muted rounded w-full"></div>
            <div className="h-3 bg-muted rounded w-2/3"></div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function ContentSkeletonLoader() {
  return (
    <div className="h-full flex flex-col bg-background animate-pulse">
      {/* Header Skeleton */}
      <div className="border-b border-border p-4 bg-card">
        <div className="space-y-3">
          <div className="h-6 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="h-4 bg-muted rounded w-1/3"></div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="flex-1 p-4 space-y-3">
        <div className="h-4 bg-muted rounded w-full"></div>
        <div className="h-4 bg-muted rounded w-5/6"></div>
        <div className="h-4 bg-muted rounded w-4/5"></div>
        <div className="h-4 bg-muted rounded w-full"></div>
        <div className="h-4 bg-muted rounded w-3/4"></div>
      </div>
    </div>
  )
}
