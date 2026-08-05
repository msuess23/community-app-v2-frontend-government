import { Check, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { TicketImageRemovalDialog } from '@/features/tickets/components/TicketImageRemovalDialog'
import { TicketImageUploadQueue } from '@/features/tickets/components/TicketImageUploadQueue'
import type { TicketImageRecord } from '@/features/tickets/model/ticket-collaboration'
import { getTicketImageErrorPresentation } from '@/features/tickets/model/ticket-image-errors'
import {
  useSetTicketCoverImageMutation,
  useUploadTicketImageMutation,
} from '@/features/tickets/queries/ticket-image-mutations'
import { useFeedback } from '@/shared/feedback/feedback-context'
import {
  formatDisplayDateTime,
  formatDisplayFileSize,
} from '@/shared/format/display-values'
import { MediaGallery } from '@/shared/media/MediaGallery'
import type { MediaAsset } from '@/shared/media/media-model'
import { Button } from '@/shared/ui/Button'

export type TicketImageManagerProps = Readonly<{
  canManageImages: boolean
  canViewRemoved: boolean
  images: readonly TicketImageRecord[]
  onPendingChange: (hasPendingItems: boolean) => void
  ticketId: string
}>

/** Coordinates current image actions while keeping removed revisions read-only. */
export function TicketImageManager({
  canManageImages,
  canViewRemoved,
  images,
  onPendingChange,
  ticketId,
}: TicketImageManagerProps) {
  const { notify } = useFeedback()
  const uploadMutation = useUploadTicketImageMutation()
  const coverMutation = useSetTicketCoverImageMutation()
  const [removalTarget, setRemovalTarget] = useState<MediaAsset | null>(null)
  const activeImages = images.filter((image) => image.isActive)
  const removedImages = images.filter((image) => !image.isActive)
  const isCollectionActionPending = coverMutation.isPending

  async function setCover(asset: MediaAsset): Promise<void> {
    try {
      await coverMutation.mutateAsync({ imageId: asset.id, ticketId })
      notify({
        dedupeKey: `ticket-cover:${ticketId}:${asset.id}`,
        description:
          'Das ausgewählte Bild wird jetzt als Titelbild des Tickets verwendet.',
        title: 'Titelbild aktualisiert',
        tone: 'success',
      })
    } catch (error) {
      notify({ ...getTicketImageErrorPresentation(error), tone: 'error' })
    }
  }

  return (
    <div className="space-y-7">
      {canManageImages ? (
        <TicketImageUploadQueue
          isDisabled={isCollectionActionPending}
          onPendingChange={onPendingChange}
          onUpload={async ({ file }) => {
            const image = await uploadMutation.mutateAsync({ file, ticketId })
            notify({
              dedupeKey: `ticket-image-upload:${ticketId}:${image.asset.id}`,
              description:
                'Das Bild wurde als unveränderliche Revision gespeichert und dem aktuellen Ticketstand hinzugefügt.',
              title: 'Ticketbild hochgeladen',
              tone: 'success',
            })
          }}
        />
      ) : (
        <p className="border-outline-variant bg-surface-container-low text-on-surface-variant rounded-xl border p-4 text-sm leading-6">
          Der aktuelle Ticketzustand oder deine Zuständigkeit erlaubt keine
          Änderungen an den Bildern. Vorhandene Revisionen bleiben lesbar.
        </p>
      )}

      <div className="space-y-3">
        <div>
          <h3 className="text-lg font-semibold">Aktuelle Bilder</h3>
          {canManageImages ? (
            <p className="text-on-surface-variant mt-1 text-sm leading-6">
              Beim Entfernen bleibt die Datei für berechtigte Mitarbeiter als
              historische Revision erhalten. Wird das Titelbild entfernt,
              wählt das Backend gegebenenfalls ein Ersatz-Titelbild.
            </p>
          ) : null}
        </div>
        <MediaGallery
          assets={activeImages.map((image) => image.asset)}
          emptyMessage="Für dieses Ticket sind aktuell keine Bilder vorhanden."
          label="Aktuelle Ticketbilder"
          layout="carousel"
          renderActions={(asset) => (
            <>
              <TicketImageMetadata
                image={activeImages.find(
                  (image) => image.asset.id === asset.id,
                )}
              />
              {canManageImages && !asset.isCover ? (
                <Button
                  aria-label={`Als Titelbild verwenden: ${asset.originalFilename}`}
                  isDisabled={
                    isCollectionActionPending || uploadMutation.isPending
                  }
                  onPress={() => void setCover(asset)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Check aria-hidden="true" size={16} />
                  Als Titelbild verwenden
                </Button>
              ) : null}
              {canManageImages ? (
                <Button
                  aria-label={`Bild entfernen: ${asset.originalFilename}`}
                  isDisabled={
                    isCollectionActionPending || uploadMutation.isPending
                  }
                  onPress={() => setRemovalTarget(asset)}
                  size="sm"
                  type="button"
                  variant="danger"
                >
                  <Trash2 aria-hidden="true" size={16} />
                  Bild entfernen
                </Button>
              ) : null}
            </>
          )}
        />
      </div>

      {canViewRemoved ? (
        <div className="border-outline-variant space-y-3 border-t pt-6">
          <div>
            <h3 className="text-lg font-semibold">Historisch entfernte Bilder</h3>
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

      {canManageImages ? (
        <TicketImageRemovalDialog
          asset={removalTarget}
          onClose={() => setRemovalTarget(null)}
          ticketId={ticketId}
        />
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
