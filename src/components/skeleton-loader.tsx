export function SkeletonLoader({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-4 rounded-xl border border-border/50 bg-card/30 relative overflow-hidden isolate"
        >
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-primary/5 to-transparent z-0" />
          <div className="flex items-center justify-between mb-2 relative z-10">
            <div className="flex-1 space-y-3">
              <div className="h-4 bg-muted/60 rounded-md w-3/4"></div>
              <div className="h-3 bg-muted/40 rounded-md w-1/2"></div>
            </div>
          </div>
        </div>
      ))}
    </>
  )
}

export function EmailSkeletonLoader({ count = 5 }: { count?: number }) {
  return (
    <div className="p-2 space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-4 rounded-xl border border-border/50 bg-card/30 relative overflow-hidden isolate shadow-sm"
        >
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-muted/30 to-transparent z-0" />
          <div className="flex items-center justify-between mb-0 relative z-10">
            <div className="flex-1 space-y-3">
              <div className="h-4 bg-muted/60 rounded-md w-[85%]"></div>
              <div className="h-3 bg-muted/40 rounded-md w-[45%] mt-2"></div>
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
          className="p-4 rounded-xl border border-border/50 bg-card/30 relative overflow-hidden isolate shadow-sm"
        >
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-muted/30 to-transparent z-0" />
          <div className="space-y-4 relative z-10">
            <div className="flex items-center justify-between">
              <div className="h-4 bg-muted/80 rounded-md w-1/3"></div>
              <div className="h-3 bg-muted/40 rounded-md w-20"></div>
            </div>
            <div className="space-y-2 mt-4">
              <div className="h-4 bg-muted/50 rounded-md w-[90%]"></div>
              <div className="h-4 bg-muted/40 rounded-md w-[70%]"></div>
            </div>
            <div className="flex gap-2 pt-2">
              <div className="h-5 bg-muted/30 rounded-md w-16"></div>
              <div className="h-5 bg-muted/30 rounded-md w-12"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function ContentSkeletonLoader() {
  return (
    <div className="h-full flex flex-col bg-background relative overflow-hidden isolate">
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-muted/10 to-transparent z-0 pointer-events-none" />

      {/* Header Skeleton */}
      <div className="border-b border-border/40 p-6 bg-card/50 relative z-10">
        <div className="max-w-4xl mx-auto space-y-5">
          <div className="h-8 bg-muted/60 rounded-lg w-[75%]"></div>
          <div className="flex gap-4">
            <div className="h-10 w-10 rounded-full bg-muted/50 shrink-0"></div>
            <div className="space-y-2 flex-1 pt-1">
              <div className="h-4 bg-muted/60 rounded-md w-48"></div>
              <div className="h-3 bg-muted/40 rounded-md w-24"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="flex-1 p-6 relative z-10">
        <div className="max-w-4xl mx-auto space-y-4 border border-border/40 bg-muted/10 p-8 rounded-xl">
          <div className="h-4 bg-muted/50 rounded-md w-full"></div>
          <div className="h-4 bg-muted/50 rounded-md w-[95%]"></div>
          <div className="h-4 bg-muted/50 rounded-md w-[85%]"></div>
          <div className="h-4 bg-muted/50 rounded-md w-full"></div>
          <div className="h-4 bg-muted/50 rounded-md w-[60%]"></div>

          <div className="pt-8 space-y-4">
            <div className="h-4 bg-muted/50 rounded-md w-[80%]"></div>
            <div className="h-4 bg-muted/50 rounded-md w-[90%]"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
