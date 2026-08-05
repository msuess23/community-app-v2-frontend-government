import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { useAuth } from '@/auth/auth-context'
import { TicketImageManager } from '@/features/tickets/components/TicketImageManager'
import { TICKET_READ_ERROR_MESSAGES } from '@/features/tickets/model/ticket-error-messages'
import { createTicketImagesQueryOptions } from '@/features/tickets/queries/ticket-queries'
import { useUnsavedChangesGuard } from '@/shared/forms/use-unsaved-changes-guard'
import { RemoteDataBoundary } from '@/shared/remote-data/RemoteDataBoundary'

export type TicketImagesProps = Readonly<{
  canManageImages: boolean
  ticketId: string
}>

/**
 * Loads revision-aware images and exposes management only when the backend
 * permits it.
 */
export function TicketImages({
  canManageImages,
  ticketId,
}: TicketImagesProps) {
  const { user } = useAuth()
  const [hasPendingUploads, setHasPendingUploads] = useState(false)
  const includeRemoved =
    user?.role === 'OFFICER' || user?.role === 'MANAGER'
  const query = useQuery(
    createTicketImagesQueryOptions(ticketId, includeRemoved),
  )

  return (
    <>
      {canManageImages ? (
        <TicketPendingUploadGuard hasPendingUploads={hasPendingUploads} />
      ) : null}
      <RemoteDataBoundary
        errorOptions={{
          fallback: {
            description:
              'Die Ticketbilder konnten nicht geladen werden. Die übrigen Ticketdaten bleiben verfügbar.',
            title: 'Bilder nicht verfügbar',
          },
          messagesByErrorCode: TICKET_READ_ERROR_MESSAGES,
        }}
        loadingLabel="Ticketbilder werden geladen."
        query={query}
      >
        {(images) => (
          <TicketImageManager
            canManageImages={canManageImages}
            canViewRemoved={includeRemoved}
            images={images}
            onPendingChange={setHasPendingUploads}
            ticketId={ticketId}
          />
        )}
      </RemoteDataBoundary>
    </>
  )
}

function TicketPendingUploadGuard({
  hasPendingUploads,
}: Readonly<{ hasPendingUploads: boolean }>) {
  useUnsavedChangesGuard({
    hasUnsavedChanges: hasPendingUploads,
    message: {
      description:
        'Mindestens ein ausgewähltes Ticketbild wurde noch nicht erfolgreich hochgeladen. Beim Verlassen geht die lokale Warteschlange verloren.',
      title: 'Bild-Uploads verwerfen?',
    },
  })
  return null
}
