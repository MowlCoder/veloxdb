import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/data/query-keys'
import { veloxDbRepository } from '@/data/repositories'
import type { TableInfo } from '@/data/types'

export function useTablesQuery(connectionId: string | undefined | null) {
  return useQuery({
    queryKey: queryKeys.tables(connectionId),
    queryFn: () => veloxDbRepository.getTables(connectionId ?? undefined),
    enabled: Boolean(connectionId),
    staleTime: 30 * 1000,
  })
}

export type TablesQueryResult = TableInfo[]

