import type { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

import {
  commitMutationResult,
  refreshQueryKeys,
} from '@/shared/remote-data/mutation-cache'

describe('commitMutationResult', () => {
  it('protects and updates the detail before invalidating related projections', async () => {
    const queryClient = createQueryClientMock()
    const detailKey = ['resource', 'tickets', 'detail', 'ticket-1'] as const
    const listKey = ['resource', 'tickets', 'list'] as const
    const eventsKey = [...detailKey, 'events'] as const
    const data = { id: 'ticket-1', status: 'IN_PROGRESS' }

    await commitMutationResult(queryClient, {
      data,
      detailKey,
      invalidate: [listKey, eventsKey],
    })

    expect(queryClient.cancelQueries).toHaveBeenCalledWith({
      exact: true,
      queryKey: detailKey,
    })
    expect(queryClient.setQueryData).toHaveBeenCalledWith(detailKey, data)
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: listKey,
    })
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: eventsKey,
    })
    expect(queryClient.setQueryData.mock.invocationCallOrder[0]).toBeLessThan(
      queryClient.invalidateQueries.mock.invocationCallOrder[0] ?? Infinity,
    )
  })
})

describe('refreshQueryKeys', () => {
  it('cancels stale requests before marking their projections for refresh', async () => {
    const queryClient = createQueryClientMock()
    const detailKey = ['resource', 'tickets', 'detail', 'ticket-1'] as const

    await refreshQueryKeys(queryClient, [detailKey])

    expect(queryClient.cancelQueries).toHaveBeenCalledWith({
      queryKey: detailKey,
    })
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: detailKey,
    })
    expect(queryClient.cancelQueries.mock.invocationCallOrder[0]).toBeLessThan(
      queryClient.invalidateQueries.mock.invocationCallOrder[0] ?? Infinity,
    )
  })
})

function createQueryClientMock() {
  return {
    cancelQueries: vi.fn().mockResolvedValue(undefined),
    invalidateQueries: vi.fn().mockResolvedValue(undefined),
    setQueryData: vi.fn(),
  } satisfies Pick<
    QueryClient,
    'cancelQueries' | 'invalidateQueries' | 'setQueryData'
  >
}
