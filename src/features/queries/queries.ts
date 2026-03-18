import { useMutation } from '@tanstack/react-query'

import { veloxDbRepository } from '@/data/repositories'
import type { QueryRequest, QueryResult } from '@/data/types'

type UseRunQueryMutationOptions = {
  onSuccess?: (result: QueryResult, variables: QueryRequest) => void
}

export function useRunQueryMutation(options: UseRunQueryMutationOptions = {}) {
  return useMutation({
    mutationFn: (request: QueryRequest) => veloxDbRepository.runQuery(request),
    onSuccess: (result, variables) => {
      options.onSuccess?.(result, variables)
    },
  })
}

