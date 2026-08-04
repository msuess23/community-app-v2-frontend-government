import { Check, Trash2 } from 'lucide-react'

import {
  getInfoImageErrorPresentation,
  getInfoImageUploadErrorMessage,
} from '@/features/infos/model/info-image-errors'
import {
  useDeleteInfoImageMutation,
  useSetInfoCoverImageMutation,
  useUploadInfoImageMutation,
} from '@/features/infos/queries/info-image-mutations'
import { useConfirmation } from '@/shared/confirmation/confirmation-context'
import { useFeedback } from '@/shared/feedback/feedback-context'
import { MediaGallery } from '@/shared/media/MediaGallery'
import { MediaUploadQueue } from '@/shared/media/MediaUploadQueue'
import type { MediaAsset } from '@/shared/media/media-model'
import { Button } from '@/shared/ui/Button'

const INFO_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const
const INFO_IMAGE_MAX_BYTES = 5 * 1024 * 1024
const INFO_IMAGE_ALT_TEXT_MAX_LENGTH = 500

/** Combines reusable media UI with Info-specific endpoints and permissions. */
export function InfoImageManager({
  assets,
  infoId,
}: Readonly<{
  assets: readonly MediaAsset[]
  infoId: string
}>) {
  const { confirm } = useConfirmation()
  const { notify } = useFeedback()
  const uploadMutation = useUploadInfoImageMutation(infoId)
  const coverMutation = useSetInfoCoverImageMutation(infoId)
  const deleteMutation = useDeleteInfoImageMutation(infoId)
  const isCollectionActionPending =
    coverMutation.isPending || deleteMutation.isPending

  async function setCover(asset: MediaAsset): Promise<void> {
    try {
      await coverMutation.mutateAsync({ imageId: asset.id })
      notify({
        dedupeKey: `info-cover:${infoId}:${asset.id}`,
        description:
          'Das ausgewählte Bild wird jetzt im Mitteilungsverzeichnis als Titelbild verwendet.',
        title: 'Titelbild aktualisiert',
        tone: 'success',
      })
    } catch (error) {
      const presentation = getInfoImageErrorPresentation(error)
      notify({ ...presentation, tone: 'error' })
    }
  }

  async function deleteImage(asset: MediaAsset): Promise<void> {
    const accepted = await confirm({
      confirmLabel: 'Bild endgültig löschen',
      description: asset.isCover
        ? `„${asset.originalFilename}“ ist derzeit das Titelbild. Nach dem Löschen bestimmt das Backend das älteste verbleibende Bild als neues Titelbild. Die Datei wird dauerhaft entfernt.`
        : `„${asset.originalFilename}“ wird dauerhaft aus dieser Mitteilung und aus dem Dateispeicher entfernt.`,
      title: 'Bild löschen?',
      tone: 'danger',
    })

    if (!accepted) {
      return
    }

    try {
      await deleteMutation.mutateAsync({ imageId: asset.id })
      notify({
        dedupeKey: `info-image-delete:${infoId}:${asset.id}`,
        description:
          'Die Datei wurde entfernt. Die Bilderliste und das mögliche Ersatz-Titelbild entsprechen dem Serverstand.',
        title: 'Bild gelöscht',
        tone: 'success',
      })
    } catch (error) {
      const presentation = getInfoImageErrorPresentation(error)
      notify({ ...presentation, tone: 'error' })
    }
  }

  return (
    <div className="space-y-6">
      <MediaUploadQueue
        accept={INFO_IMAGE_MIME_TYPES.join(',')}
        allowedMimeTypes={INFO_IMAGE_MIME_TYPES}
        descriptionField={{
          description:
            'Beschreibe den relevanten Bildinhalt so, dass die Mitteilung auch ohne visuelle Wahrnehmung verständlich bleibt.',
          label: 'Alternativtext',
          maxLength: INFO_IMAGE_ALT_TEXT_MAX_LENGTH,
          placeholder: 'Zum Beispiel: Umleitungsskizze rund um die gesperrte Parkstraße',
          required: true,
        }}
        formatUploadError={getInfoImageUploadErrorMessage}
        isDisabled={isCollectionActionPending}
        maxBytes={INFO_IMAGE_MAX_BYTES}
        onUpload={async ({ description, file }) => {
          if (!description) {
            throw new Error('Info images require an alternative text.')
          }
          await uploadMutation.mutateAsync({ altText: description, file })
        }}
      />

      <section
        aria-labelledby="published-info-images-heading"
        className="space-y-4"
      >
        <div className="space-y-1">
          <h3
            className="text-lg font-semibold"
            id="published-info-images-heading"
          >
            Veröffentlichte Bilder
          </h3>
          <p className="text-on-surface-variant text-sm leading-6">
            Das Titelbild erscheint zusätzlich im Mitteilungsverzeichnis.
            Änderungen werden ausschließlich aus bestätigten Serverantworten
            übernommen.
          </p>
        </div>
        <MediaGallery
          assets={assets}
          renderActions={(asset) => (
            <>
              {!asset.isCover ? (
                <Button
                  aria-label={`Als Titelbild verwenden: ${asset.altText ?? asset.originalFilename}`}
                  isDisabled={
                    isCollectionActionPending || uploadMutation.isPending
                  }
                  onPress={() => void setCover(asset)}
                  size="sm"
                  variant="outline"
                >
                  <Check aria-hidden="true" size={16} />
                  Als Titelbild verwenden
                </Button>
              ) : null}
              <Button
                aria-label={`Bild löschen: ${asset.altText ?? asset.originalFilename}`}
                isDisabled={
                  isCollectionActionPending || uploadMutation.isPending
                }
                onPress={() => void deleteImage(asset)}
                size="sm"
                variant="danger"
              >
                <Trash2 aria-hidden="true" size={16} />
                Bild löschen
              </Button>
            </>
          )}
        />
      </section>
    </div>
  )
}
