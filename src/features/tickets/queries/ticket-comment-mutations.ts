import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { TicketCommentCreateRequest } from '@/api/generated/models'
import { addTicketCommentApiV1TicketsTicketIdCommentsPost } from '@/api/generated/tickets/tickets'
import {
  mapTicketCommentResponse,
  type TicketCommentRecord,
} from '@/features/tickets/model/ticket-collaboration'
import { ticketFeatureQueryKeys } from '@/features/tickets/queries/ticket-query-keys'

export type AddTicketCommentVariables = Readonly<{
  request: TicketCommentCreateRequest
  ticketId: string
}>

/** Appends one server-confirmed comment and refreshes every affected projection. */
export function useAddTicketCommentMutation() {
  const queryClient = useQueryClient()

  return useMutation<TicketCommentRecord, unknown, AddTicketCommentVariables>({
    mutationFn: async ({ request, ticketId }) =>
      mapTicketCommentResponse(
        await addTicketCommentApiV1TicketsTicketIdCommentsPost(
          ticketId,
          request,
        ),
      ),
    mutationKey: ['tickets', 'comments', 'append'],
    onSuccess: async (comment, { ticketId }) => {
      const commentsKey = ticketFeatureQueryKeys.comments(ticketId)
      await queryClient.cancelQueries({ exact: true, queryKey: commentsKey })
      queryClient.setQueryData<TicketCommentRecord[]>(
        commentsKey,
        (current = []) =>
          current.some((item) => item.id === comment.id)
            ? current
            : [...current, comment],
      )

      await Promise.all([
        queryClient.invalidateQueries({
          exact: true,
          queryKey: ticketFeatureQueryKeys.detail(ticketId),
        }),
        queryClient.invalidateQueries({
          queryKey: ticketFeatureQueryKeys.events(ticketId),
        }),
        queryClient.invalidateQueries({
          queryKey: ticketFeatureQueryKeys.lists(),
        }),
      ])
    },
  })
}
