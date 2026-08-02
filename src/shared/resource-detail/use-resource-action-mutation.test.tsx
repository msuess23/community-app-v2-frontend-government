import { QueryClientProvider } from '@tanstack/react-query'
import { screen, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { vi } from 'vitest'

import { ApiError } from '@/api/client/api-error'
import { createQueryClient } from '@/app/query-client'
import { FeedbackProvider } from '@/shared/feedback/FeedbackProvider'
import { useResourceActionMutation } from '@/shared/resource-detail/use-resource-action-mutation'
import { Button } from '@/shared/ui/Button'

const detailKey = ['resource', 'tickets', 'detail', 'ticket-1'] as const
const listKey = ['resource', 'tickets', 'list'] as const
const eventKey = [...detailKey, 'events'] as const

type Ticket = Readonly<{
  id: string
  status: string
}>

interface MutationHarnessProps {
  mutationFn: () => Promise<Ticket>
}

/** Exposes the shared resource mutation lifecycle through one observable action. */
function MutationHarness({ mutationFn }: MutationHarnessProps) {
  const mutation = useResourceActionMutation<Ticket, void>({
    conflictQueryKeys: () => [detailKey, eventKey],
    getCachePlan: () => ({
      detailKey,
      invalidate: [listKey, eventKey],
    }),
    mutationFn,
    successFeedback: {
      title: 'Anliegen aktualisiert',
    },
  })

  return (
    <Button onPress={() => mutation.mutate()}>Serveraktion ausführen</Button>
  )
}

describe('useResourceActionMutation', () => {
  it('commits the server result before refreshing related projections', async () => {
    const user = userEvent.setup()
    const queryClient = createQueryClient()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    const serverResult = { id: 'ticket-1', status: 'COMPLETED' }

    renderMutationHarness(
      <MutationHarness mutationFn={vi.fn().mockResolvedValue(serverResult)} />,
      queryClient,
    )

    await user.click(
      screen.getByRole('button', { name: 'Serveraktion ausführen' }),
    )

    expect(await screen.findByText('Anliegen aktualisiert')).toBeInTheDocument()
    expect(queryClient.getQueryData(detailKey)).toEqual(serverResult)
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: listKey })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: eventKey })
  })

  it('refreshes stale projections and presents a warning after a conflict', async () => {
    const user = userEvent.setup()
    const queryClient = createQueryClient()
    const cancelQueries = vi.spyOn(queryClient, 'cancelQueries')
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    const conflict = new ApiError({
      errorCode: 'WORKFLOW_VALIDATION_FAILED',
      message: 'Technical workflow details',
      status: 409,
    })

    renderMutationHarness(
      <MutationHarness mutationFn={vi.fn().mockRejectedValue(conflict)} />,
      queryClient,
    )

    await user.click(
      screen.getByRole('button', { name: 'Serveraktion ausführen' }),
    )

    expect(
      await screen.findByText('Daten wurden zwischenzeitlich geändert'),
    ).toBeInTheDocument()
    expect(cancelQueries).toHaveBeenCalledWith({ queryKey: detailKey })
    expect(cancelQueries).toHaveBeenCalledWith({ queryKey: eventKey })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: detailKey })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: eventKey })
    expect(
      screen.queryByText('Technical workflow details'),
    ).not.toBeInTheDocument()
  })
})

/** Renders the hook with only the data and feedback services it requires. */
function renderMutationHarness(
  children: ReactNode,
  queryClient: ReturnType<typeof createQueryClient>,
) {
  return render(
    <QueryClientProvider client={queryClient}>
      <FeedbackProvider>{children}</FeedbackProvider>
    </QueryClientProvider>,
  )
}
