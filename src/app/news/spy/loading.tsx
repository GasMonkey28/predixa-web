/**
 * Loading state for SPY News page
 * Shows a skeleton while the page is loading
 */

export default function SpyNewsLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <div className="relative mx-auto max-w-6xl px-6 py-12">
        {/* Header Skeleton */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 h-10 w-96 animate-pulse rounded bg-zinc-800"></div>
          <div className="mx-auto h-4 w-64 animate-pulse rounded bg-zinc-800"></div>
        </div>

        {/* Briefing Card Skeleton */}
        <div className="mb-8 rounded-2xl border border-zinc-800/50 bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 p-6 backdrop-blur-sm">
          <div className="mb-4 h-8 w-64 animate-pulse rounded bg-zinc-800"></div>
          <div className="mb-4 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-4 w-full animate-pulse rounded bg-zinc-800"></div>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="h-6 w-16 animate-pulse rounded-full bg-zinc-800"></div>
            <div className="h-6 w-16 animate-pulse rounded-full bg-zinc-800"></div>
          </div>
        </div>

        {/* News Articles Skeleton */}
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="rounded-lg border border-zinc-800/50 bg-zinc-900/50 p-4"
            >
              <div className="mb-2 flex items-center gap-2">
                <div className="h-4 w-24 animate-pulse rounded bg-zinc-800"></div>
                <div className="h-4 w-20 animate-pulse rounded bg-zinc-800"></div>
              </div>
              <div className="mb-2 h-6 w-full animate-pulse rounded bg-zinc-800"></div>
              <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-800"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

