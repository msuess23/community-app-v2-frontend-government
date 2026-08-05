import {
  AlertCircle,
  CheckCircle2,
  FileText,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react'

import { formatDisplayFileSize } from '@/shared/format/display-values'
import type {
  MediaUploadDescriptionField,
  MediaUploadItem,
  MediaUploadPrimarySelection,
  MediaUploadState,
  MediaUploadValidationOptions,
} from '@/shared/media/media-upload-model'
import { validateMediaUploadItem } from '@/shared/media/media-upload-validation'
import { Button } from '@/shared/ui/Button'
import { TextAreaField } from '@/shared/ui/TextAreaField'

export interface MediaUploadQueueItemProps {
  descriptionField?: MediaUploadDescriptionField
  isDisabled: boolean
  item: MediaUploadItem
  onDescriptionChange: (value: string) => void
  onRemove: () => void
  onRetry?: () => void
  onSelectPrimary?: () => void
  primarySelection?: MediaUploadPrimarySelection
  validationOptions: MediaUploadValidationOptions
}

/** Renders one independently actionable file inside a reusable media queue. */
export function MediaUploadQueueItem({
  descriptionField,
  isDisabled,
  item,
  onDescriptionChange,
  onRemove,
  onRetry,
  onSelectPrimary,
  primarySelection,
  validationOptions,
}: MediaUploadQueueItemProps) {
  const errorMessage =
    item.errorMessage ?? validateMediaUploadItem(item, validationOptions)

  return (
    <li className="border-outline-variant bg-surface-container-lowest rounded-xl border p-4">
      <div className="grid gap-4 md:grid-cols-[10rem_minmax(0,1fr)]">
        <UploadPreview item={item} />
        <div className="min-w-0 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="truncate font-semibold">{item.file.name}</p>
              <p className="text-on-surface-variant mt-1 text-sm">
                {formatDisplayFileSize(item.file.size)}
              </p>
            </div>
            <UploadStateLabel state={item.state} />
          </div>

          {descriptionField ? (
            <TextAreaField
              description={descriptionField.description}
              errorMessage={errorMessage}
              isDisabled={isDisabled || item.state === 'uploaded'}
              isInvalid={Boolean(errorMessage)}
              isRequired={descriptionField.required}
              label={`${descriptionField.label} für ${item.file.name}`}
              maxLength={descriptionField.maxLength}
              onChange={onDescriptionChange}
              placeholder={descriptionField.placeholder}
              rows={3}
              value={item.description}
            />
          ) : errorMessage ? (
            <p className="text-error text-sm font-medium" role="alert">
              {errorMessage}
            </p>
          ) : null}

          {primarySelection ? (
            <div className="space-y-2">
              {item.isPrimary ? (
                <p className="bg-primary-container text-on-primary-container inline-flex min-h-8 items-center rounded-full px-2.5 py-1 text-sm font-semibold">
                  {primarySelection.selectedLabel}
                </p>
              ) : (
                <Button
                  aria-label={`${primarySelection.actionLabel}: ${item.file.name}`}
                  isDisabled={isDisabled || item.state === 'uploaded'}
                  onPress={onSelectPrimary}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {primarySelection.actionLabel}
                </Button>
              )}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {item.state === 'failed' && onRetry ? (
              <Button
                aria-label={`Erneut versuchen: ${item.file.name}`}
                isDisabled={isDisabled}
                onPress={onRetry}
                size="sm"
                type="button"
                variant="outline"
              >
                <RefreshCw aria-hidden="true" size={16} />
                Erneut versuchen
              </Button>
            ) : null}
            <Button
              aria-label={`${
                item.state === 'uploaded'
                  ? 'Erledigten Eintrag entfernen'
                  : 'Aus Warteschlange entfernen'
              }: ${item.file.name}`}
              isDisabled={isDisabled || item.state === 'uploading'}
              onPress={onRemove}
              size="sm"
              type="button"
              variant="ghost"
            >
              <Trash2 aria-hidden="true" size={16} />
              {item.state === 'uploaded'
                ? 'Erledigten Eintrag entfernen'
                : 'Aus Warteschlange entfernen'}
            </Button>
          </div>
        </div>
      </div>
    </li>
  )
}

function UploadPreview({ item }: Readonly<{ item: MediaUploadItem }>) {
  return (
    <div className="bg-surface-container flex aspect-video items-center justify-center overflow-hidden rounded-lg">
      {item.previewUrl ? (
        <img alt="" className="size-full object-cover" src={item.previewUrl} />
      ) : (
        <FileText
          aria-hidden="true"
          className="text-on-surface-variant"
          size={32}
        />
      )}
    </div>
  )
}

function UploadStateLabel({ state }: Readonly<{ state: MediaUploadState }>) {
  if (state === 'uploaded') {
    return (
      <span className="text-on-tertiary-container bg-tertiary-container inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold">
        <CheckCircle2 aria-hidden="true" size={16} />
        Hochgeladen
      </span>
    )
  }

  if (state === 'failed') {
    return (
      <span className="text-on-error-container bg-error-container inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold">
        <AlertCircle aria-hidden="true" size={16} />
        Fehlgeschlagen
      </span>
    )
  }

  if (state === 'uploading') {
    return (
      <span className="text-on-primary-container bg-primary-container inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold">
        <Upload aria-hidden="true" size={16} />
        Wird hochgeladen
      </span>
    )
  }

  return (
    <span className="text-on-surface-variant bg-surface-container inline-flex min-h-8 shrink-0 items-center rounded-full px-2.5 py-1 text-sm font-semibold">
      Bereit
    </span>
  )
}
