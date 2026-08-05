import { Upload } from 'lucide-react'
import {
  forwardRef,
  useId,
  useImperativeHandle,
  type ChangeEvent,
} from 'react'

import { cn } from '@/shared/lib/cn'
import { MediaUploadQueueItem } from '@/shared/media/MediaUploadQueueItem'
import type {
  MediaUploadDescriptionField,
  MediaUploadPrimarySelection,
  MediaUploadQueueHandle,
  MediaUploadRequest,
  MediaUploadValidationOptions,
} from '@/shared/media/media-upload-model'
import { createMediaQueueAnnouncement } from '@/shared/media/media-upload-validation'
import { useMediaUploadQueue } from '@/shared/media/use-media-upload-queue'
import { Button } from '@/shared/ui/Button'

export type {
  MediaUploadDescriptionField,
  MediaUploadPrimarySelection,
  MediaUploadQueueHandle,
  MediaUploadRequest,
  MediaUploadSummary,
} from '@/shared/media/media-upload-model'

export interface MediaUploadQueueProps {
  accept: string
  allowedMimeTypes?: readonly string[]
  descriptionField?: MediaUploadDescriptionField
  formatUploadError?: (error: unknown) => string
  id?: string
  isDisabled?: boolean
  label?: string
  maxBytes?: number
  onPendingChange?: (hasPendingItems: boolean) => void
  onUpload: (request: MediaUploadRequest) => Promise<void>
  primarySelection?: MediaUploadPrimarySelection
  showUploadAction?: boolean
}

/**
 * Coordinates the accessible queue UI while delegating state and validation to
 * focused reusable modules. Feature adapters retain all endpoint semantics.
 */
export const MediaUploadQueue = forwardRef<
  MediaUploadQueueHandle,
  MediaUploadQueueProps
>(function MediaUploadQueue(
  {
    accept,
    allowedMimeTypes,
    descriptionField,
    formatUploadError = () =>
      'Das Bild konnte nicht hochgeladen werden. Versuche es erneut.',
    id,
    isDisabled = false,
    label = 'Bilder hochladen',
    maxBytes,
    onPendingChange,
    onUpload,
    primarySelection,
    showUploadAction = true,
  },
  ref,
) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const descriptionId = `${inputId}-description`
  const validationOptions: MediaUploadValidationOptions = {
    allowedMimeTypes,
    descriptionField,
    maxBytes,
  }
  const queue = useMediaUploadQueue({
    ...validationOptions,
    formatUploadError,
    isDisabled,
    onPendingChange,
    onUpload,
    supportsPrimarySelection: Boolean(primarySelection),
  })

  useImperativeHandle(
    ref,
    () => ({
      clearAll: queue.clearAll,
      hasItems: () => queue.items.length > 0,
      hasPendingItems: () => queue.hasPendingItems,
      uploadAll: queue.uploadAll,
      validateAll: queue.validateAll,
    }),
    [
      queue.clearAll,
      queue.hasPendingItems,
      queue.items.length,
      queue.uploadAll,
      queue.validateAll,
    ],
  )

  function handleSelection(event: ChangeEvent<HTMLInputElement>): void {
    queue.addFiles(Array.from(event.target.files ?? []))
    event.target.value = ''
  }

  return (
    <section
      aria-busy={queue.isUploading}
      aria-labelledby={`${inputId}-heading`}
      className="border-outline-variant bg-surface-container-low rounded-xl border p-4 sm:p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold" id={`${inputId}-heading`}>
            {label}
          </h3>
          <div
            className="text-on-surface-variant max-w-3xl space-y-1 text-sm leading-6"
            id={descriptionId}
          >
            <p>
              Wähle eine oder mehrere Dateien aus. Die Warteschlange überträgt
              sie nacheinander, damit Fehler pro Bild nachvollziehbar bleiben.
            </p>
            {primarySelection?.description ? (
              <p>{primarySelection.description}</p>
            ) : null}
          </div>
        </div>
        <span className="bg-primary-container text-on-primary-container flex size-11 shrink-0 items-center justify-center rounded-full">
          <Upload aria-hidden="true" size={20} />
        </span>
      </div>

      <div className="mt-5">
        <label
          className="text-on-surface mb-2 block text-sm font-semibold"
          htmlFor={inputId}
        >
          Bilddateien auswählen
        </label>
        <input
          accept={accept}
          aria-describedby={descriptionId}
          className={cn(
            'file:bg-primary file:text-on-primary file:hover:bg-primary-hover',
            'text-on-surface-variant w-full text-sm file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-lg file:border-0 file:px-4 file:py-2 file:font-semibold',
            'focus-visible:outline-primary rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-60',
          )}
          disabled={isDisabled || queue.isUploading}
          id={inputId}
          multiple
          onChange={handleSelection}
          type="file"
        />
      </div>

      <p aria-live="polite" className="sr-only">
        {createMediaQueueAnnouncement(queue)}
      </p>

      {queue.items.length > 0 ? (
        <ul aria-label="Upload-Warteschlange" className="mt-6 space-y-4">
          {queue.items.map((item) => (
            <MediaUploadQueueItem
              descriptionField={descriptionField}
              isDisabled={isDisabled || queue.isUploading}
              item={item}
              key={item.id}
              onDescriptionChange={(value) =>
                queue.updateDescription(item.id, value)
              }
              onRemove={() => queue.removeItem(item.id)}
              onRetry={
                item.state === 'failed' && showUploadAction
                  ? () => void queue.retryItem(item.id)
                  : undefined
              }
              onSelectPrimary={
                primarySelection
                  ? () => queue.selectPrimary(item.id)
                  : undefined
              }
              primarySelection={primarySelection}
              validationOptions={validationOptions}
            />
          ))}
        </ul>
      ) : (
        <p className="text-on-surface-variant mt-5 text-sm leading-6">
          Noch keine Dateien ausgewählt.
        </p>
      )}

      {queue.items.length > 0 ? (
        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-on-surface-variant text-sm">
            {queue.uploadedCount} hochgeladen, {queue.failedCount}{' '}
            fehlgeschlagen, {queue.pendingCount} ausstehend
          </p>
          {showUploadAction ? (
            <Button
              isDisabled={
                isDisabled || queue.isUploading || !queue.hasUploadableItems
              }
              onPress={() => void queue.uploadAll()}
              type="button"
            >
              <Upload aria-hidden="true" size={18} />
              {queue.isUploading
                ? 'Bilder werden hochgeladen …'
                : 'Bilder hochladen'}
            </Button>
          ) : (
            <p className="text-on-surface-variant text-sm leading-6">
              Die ausgewählten Bilder werden nach dem erfolgreichen Speichern
              der Stammdaten automatisch hochgeladen.
            </p>
          )}
        </div>
      ) : null}
    </section>
  )
})
