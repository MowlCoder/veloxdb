import { useQuery } from '@tanstack/react-query'
import { veloxDbRepository } from '@/data/repositories'

export function useConnectionHealth(connectionId: string | null) {
  return useQuery({
    queryKey: ['connectionHealth', connectionId],
    queryFn: () => veloxDbRepository.pingConnection(connectionId!),
    enabled: Boolean(connectionId),
    refetchInterval: 30_000,
    retry: 1,
    staleTime: 25_000,
  })
}
