import { QueryClient } from '@tanstack/react-query'

/**
 * Desktop-oriented TanStack Query defaults:
 * - reduce noisy refetches (focus/reconnect)
 * - prefer cached data longer (gcTime)
 * - keep queries fresh enough for interactive UX
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Default freshness for the UI; individual queries can override.
        staleTime: 60 * 1000,
        // Keep data in memory longer for desktop apps.
        gcTime: 30 * 60 * 1000,
        // Avoid refetch thrash when the user switches windows.
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        // Retry once for transient failures (e.g. DB hiccups).
        retry: 1,
      },
      mutations: {
        // Mutations are usually user-triggered; avoid automatic retries.
        retry: 0,
      },
    },
  })
}

