/**
 * Global loading state for route transitions
 * Shows a loading indicator when navigating between pages
 */

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  )
}

