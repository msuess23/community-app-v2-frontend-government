import { forwardRef } from 'react'

import { getTicketImageUploadErrorMessage } from '@/features/tickets/model/ticket-image-errors'
import {
  MediaUploadQueue,
  type MediaUploadQueueHandle,
  type MediaUploadRequest,
} from '@/shared/media/MediaUploadQueue'

const TICKET_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const
const TICKET_IMAGE_MAX_BYTES = 5 * 1024 * 1024

export type TicketImageUploadQueueProps = Readonly<{
  isDisabled?: boolean
  onPendingChange?: (hasPendingItems: boolean) => void
  onUpload: (request: MediaUploadRequest) => Promise<void>
}>

/** Applies the ticket image contract to the shared sequential upload queue. */
export const TicketImageUploadQueue = forwardRef<
  MediaUploadQueueHandle,
  TicketImageUploadQueueProps
>(function TicketImageUploadQueue(
  { isDisabled, onPendingChange, onUpload },
  ref,
) {
  return (
    <MediaUploadQueue
      accept={TICKET_IMAGE_MIME_TYPES.join(',')}
      allowedMimeTypes={TICKET_IMAGE_MIME_TYPES}
      formatUploadError={getTicketImageUploadErrorMessage}
      id="ticket-image-upload"
      isDisabled={isDisabled}
      label="Ticketbilder hochladen"
      maxBytes={TICKET_IMAGE_MAX_BYTES}
      onPendingChange={onPendingChange}
      onUpload={onUpload}
      ref={ref}
    />
  )
})
