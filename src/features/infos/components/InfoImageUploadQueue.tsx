import { forwardRef } from 'react'

import { getInfoImageUploadErrorMessage } from '@/features/infos/model/info-image-errors'
import {
  MediaUploadQueue,
  type MediaUploadQueueHandle,
  type MediaUploadRequest,
} from '@/shared/media/MediaUploadQueue'

const INFO_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const
const INFO_IMAGE_MAX_BYTES = 5 * 1024 * 1024
const INFO_IMAGE_ALT_TEXT_MAX_LENGTH = 500

export interface InfoImageUploadQueueProps {
  allowCoverSelection?: boolean
  id?: string
  isDisabled?: boolean
  onUpload: (request: MediaUploadRequest) => Promise<void>
  showUploadAction?: boolean
}

/** Applies the Info-specific image contract to the reusable media queue. */
export const InfoImageUploadQueue = forwardRef<
  MediaUploadQueueHandle,
  InfoImageUploadQueueProps
>(function InfoImageUploadQueue(
  { allowCoverSelection = false, id, isDisabled, onUpload, showUploadAction },
  ref,
) {
  return (
    <MediaUploadQueue
      accept={INFO_IMAGE_MIME_TYPES.join(',')}
      allowedMimeTypes={INFO_IMAGE_MIME_TYPES}
      descriptionField={{
        description:
          'Beschreibe den relevanten Bildinhalt so, dass die Mitteilung auch ohne visuelle Wahrnehmung verständlich bleibt.',
        label: 'Alternativtext',
        maxLength: INFO_IMAGE_ALT_TEXT_MAX_LENGTH,
        placeholder:
          'Zum Beispiel: Umleitungsskizze rund um die gesperrte Parkstraße',
        required: true,
      }}
      formatUploadError={getInfoImageUploadErrorMessage}
      id={id}
      isDisabled={isDisabled}
      maxBytes={INFO_IMAGE_MAX_BYTES}
      onUpload={onUpload}
      primarySelection={
        allowCoverSelection
          ? {
              actionLabel: 'Als Titelbild vormerken',
              description:
                'Das vorgemerkte Bild wird zuerst hochgeladen und dadurch beim Anlegen automatisch zum Titelbild.',
              selectedLabel: 'Vorgemerktes Titelbild',
            }
          : undefined
      }
      ref={ref}
      showUploadAction={showUploadAction}
    />
  )
})
