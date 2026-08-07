import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/auth/auth-context'
import type { TicketImageRecord } from '@/features/tickets/model/ticket-collaboration'
import { TICKET_READ_ERROR_MESSAGES } from '@/features/tickets/model/ticket-error-messages'
import { createTicketImagesQueryOptions } from '@/features/tickets/queries/ticket-queries'
import {
  formatDisplayDateTime,
  formatDisplayFileSize,
} from '@/shared/format/display-values'
import { MediaGallery } from '@/shared/media/MediaGallery'
import { RemoteDataBoundary } from '@/shared/remote-data/RemoteDataBoundary'

export type TicketImagesProps = Readonly<{
  ticketId: string
}>

/** Loads ticket images and presents them read-only through the shared gallery. */
export function TicketImages({ ticketId }: TicketImagesProps) {
  const { user } = useAuth()
  const includeRemoved =
    user?.role === 'OFFICER' || user?.role === 'MANAGER'
  const query = useQuery(
    createTicketImagesQueryOptions(ticketId, includeRemoved),
  )

  return (
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
        <TicketImageGallery
          canViewRemoved={includeRemoved}
          images={images}
        />
      )}
    </RemoteDataBoundary>
  )
}

function TicketImageGallery({
  canViewRemoved,
  images,
}: Readonly<{
  canViewRemoved: boolean
  images: readonly TicketImageRecord[]
}>) {
  const activeImages = images.filter((image) => image.isActive)
  const removedImages = images.filter((image) => !image.isActive)

  return (
    <div className="space-y-7">
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Aktuelle Bilder</h3>
        <MediaGallery
          assets={activeImages.map((image) => image.asset)}
          emptyMessage="Für dieses Ticket sind aktuell keine Bilder vorhanden."
          label="Aktuelle Ticketbilder"
          layout="carousel"
          renderActions={(asset) => (
            <TicketImageMetadata
              image={activeImages.find(
                (image) => image.asset.id === asset.id,
              )}
            />
          )}
        />
      </div>

      {canViewRemoved ? (
        <div className="border-outline-variant space-y-3 border-t pt-6">
          <div>
            <h3 className="text-lg font-semibold">
              Historisch entfernte Bilder
            </h3>
            <p className="text-on-surface-variant mt-1 leading-7">
              Entfernte Bilder bleiben als unveränderliche Revision für die
              interne Nachvollziehbarkeit erhalten.
            </p>
          </div>
          <MediaGallery
            assets={removedImages.map((image) => image.asset)}
            emptyMessage="Es sind keine entfernten Bildrevisionen vorhanden."
            label="Historisch entfernte Ticketbilder"
            layout="grid"
            renderActions={(asset) => (
              <TicketImageMetadata
                image={removedImages.find(
                  (image) => image.asset.id === asset.id,
                )}
              />
            )}
          />
        </div>
      ) : null}
    </div>
  )
}

function TicketImageMetadata({
  image,
}: Readonly<{ image: TicketImageRecord | undefined }>) {
  if (!image) {
    return null
  }

  return (
    <dl className="grid w-full gap-2 text-sm sm:grid-cols-2">
      <div>
        <dt className="text-on-surface-variant font-medium">Dateiname</dt>
        <dd className="break-all">{image.asset.originalFilename}</dd>
      </div>
      <div>
        <dt className="text-on-surface-variant font-medium">Dateigröße</dt>
        <dd>{formatDisplayFileSize(image.asset.sizeBytes)}</dd>
      </div>
      <div>
        <dt className="text-on-surface-variant font-medium">Hochgeladen</dt>
        <dd>
          <time dateTime={image.asset.uploadedAt}>
            {formatDisplayDateTime(image.asset.uploadedAt)}
          </time>
        </dd>
      </div>
      {!image.isActive && image.removedAt ? (
        <div>
          <dt className="text-on-surface-variant font-medium">Entfernt</dt>
          <dd>
            <time dateTime={image.removedAt}>
              {formatDisplayDateTime(image.removedAt)}
            </time>
          </dd>
        </div>
      ) : null}
    </dl>
  )
}
