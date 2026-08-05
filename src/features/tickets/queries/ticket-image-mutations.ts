import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'

import {
  removeTicketImageApiV1TicketsTicketIdImagesImageIdDelete,
  setTicketCoverImageApiV1TicketsTicketIdImagesImageIdCoverPut,
  uploadTicketImageApiV1TicketsTicketIdImagesPost,
} from '@/api/generated/tickets/tickets'
import {
  mapTicketImageResponse,
  type TicketImageRecord,
} from '@/features/tickets/model/ticket-collaboration'
import { ticketFeatureQueryKeys } from '@/features/tickets/queries/ticket-query-keys'

export type UploadTicketImageVariables = Readonly<{
  file: File
  ticketId: string
}>

export type TicketImageIdentifier = Readonly<{
  imageId: string
  ticketId: string
}>

export type RemoveTicketImageVariables = TicketImageIdentifier &
  Readonly<{ reason: string | null }>

/** Uploads one image; sequencing and per-file retries remain owned by the queue. */
export function useUploadTicketImageMutation() {
  const queryClient = useQueryClient()

  return useMutation<TicketImageRecord, unknown, UploadTicketImageVariables>({
    mutationFn: async ({ file, ticketId }) =>
      mapTicketImageResponse(
        await uploadTicketImageApiV1TicketsTicketIdImagesPost(ticketId, {
          file,
        }),
      ),
    mutationKey: ['tickets', 'images', 'upload'],
    onSuccess: async (_, { ticketId }) =>
      invalidateTicketImageProjections(queryClient, ticketId),
  })
}

/** Selects the cover image and reloads all projections affected by its public URL. */
export function useSetTicketCoverImageMutation() {
  const queryClient = useQueryClient()

  return useMutation<TicketImageRecord, unknown, TicketImageIdentifier>({
    mutationFn: async ({ imageId, ticketId }) =>
      mapTicketImageResponse(
        await setTicketCoverImageApiV1TicketsTicketIdImagesImageIdCoverPut(
          ticketId,
          imageId,
        ),
      ),
    mutationKey: ['tickets', 'images', 'cover'],
    onSuccess: async (_, { ticketId }) =>
      invalidateTicketImageProjections(queryClient, ticketId),
  })
}

/** Removes one current image while preserving its historical revision server-side. */
export function useRemoveTicketImageMutation() {
  const queryClient = useQueryClient()

  return useMutation<void, unknown, RemoveTicketImageVariables>({
    mutationFn: ({ imageId, reason, ticketId }) =>
      removeTicketImageApiV1TicketsTicketIdImagesImageIdDelete(
        ticketId,
        imageId,
        { reason },
      ),
    mutationKey: ['tickets', 'images', 'remove'],
    onSuccess: async (_, { ticketId }) =>
      invalidateTicketImageProjections(queryClient, ticketId),
  })
}

async function invalidateTicketImageProjections(
  queryClient: QueryClient,
  ticketId: string,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({
      exact: true,
      queryKey: ticketFeatureQueryKeys.images(ticketId, false),
    }),
    queryClient.invalidateQueries({
      exact: true,
      queryKey: ticketFeatureQueryKeys.images(ticketId, true),
    }),
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
}
