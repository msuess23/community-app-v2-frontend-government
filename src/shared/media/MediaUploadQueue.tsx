import {
  AlertCircle,
  CheckCircle2,
  FileText,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react'
import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react'

import { formatDisplayFileSize } from '@/shared/format/display-values'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/Button'
import { TextAreaField } from '@/shared/ui/TextAreaField'

export type MediaUploadRequest = Readonly<{
  description: string | null
  file: File
}>

export type MediaUploadDescriptionField = Readonly<{
  description?: ReactNode
  label: string
  maxLength?: number
  placeholder?: string
  required?: boolean
}>

export type MediaUploadSummary = Readonly<{
  attemptedCount: number
  failedCount: number
  uploadedCount: number
}>

export interface MediaUploadQueueHandle {
  hasItems: () => boolean
  uploadAll: () => Promise<MediaUploadSummary>
  validateAll: () => boolean
}

export type MediaUploadPrimarySelection = Readonly<{
  actionLabel: string
  description?: ReactNode
  selectedLabel: string
}>

export interface MediaUploadQueueProps {
  accept: string
  allowedMimeTypes?: readonly string[]
  descriptionField?: MediaUploadDescriptionField
  formatUploadError?: (error: unknown) => string
  id?: string
  isDisabled?: boolean
  label?: string
  maxBytes?: number
  onUpload: (request: MediaUploadRequest) => Promise<void>
  primarySelection?: MediaUploadPrimarySelection
  showUploadAction?: boolean
}

type UploadState = 'failed' | 'ready' | 'uploaded' | 'uploading'

type UploadItem = Readonly<{
  description: string
  errorMessage: string | null
  file: File
  id: string
  isPrimary: boolean
  previewUrl: string | null
  state: UploadState
}>

let uploadItemSequence = 0

/** Collects image files and can upload them sequentially now or from a parent form. */
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
    onUpload,
    primarySelection,
    showUploadAction = true,
  },
  ref,
) {
  const [items, setItemsState] = useState<UploadItem[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const generatedId = useId()
  const inputId = id ?? generatedId
  const descriptionId = `${inputId}-description`
  const previewUrlsRef = useRef(new Set<string>())
  const itemsRef = useRef(items)
  const isUploadingRef = useRef(false)
  const hasUploadableItems = items.some((item) => item.state !== 'uploaded')

  function setItems(
    update: UploadItem[] | ((current: UploadItem[]) => UploadItem[]),
  ): void {
    const nextItems =
      typeof update === 'function' ? update(itemsRef.current) : update
    itemsRef.current = nextItems
    setItemsState(nextItems)
  }

  useEffect(
    () => () => {
      for (const previewUrl of previewUrlsRef.current) {
        URL.revokeObjectURL(previewUrl)
      }
      previewUrlsRef.current.clear()
    },
    [],
  )

  useImperativeHandle(
    ref,
    () => ({
      hasItems: () => itemsRef.current.length > 0,
      uploadAll: () => uploadItems(createUploadOrder(itemsRef.current)),
      validateAll: validateAllItems,
    }),
  )

  function handleSelection(event: ChangeEvent<HTMLInputElement>): void {
    const selectedFiles = Array.from(event.target.files ?? [])
    event.target.value = ''

    if (selectedFiles.length === 0) {
      return
    }

    setItems((current) => [
      ...current,
      ...selectedFiles.map((file, index) =>
        createUploadItem(
          file,
          previewUrlsRef.current,
          Boolean(primarySelection) &&
            !current.some((item) => item.isPrimary) &&
            index === 0,
        ),
      ),
    ])
  }

  function updateDescription(itemId: string, description: string): void {
    setItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              description,
              errorMessage: item.state === 'failed' ? null : item.errorMessage,
              state: item.state === 'failed' ? 'ready' : item.state,
            }
          : item,
      ),
    )
  }

  function removeItem(itemId: string): void {
    setItems((current) => {
      const item = current.find((candidate) => candidate.id === itemId)
      if (item?.previewUrl) {
        revokePreviewUrl(item.previewUrl, previewUrlsRef.current)
      }
      const remaining = current.filter((candidate) => candidate.id !== itemId)
      if (item?.isPrimary && primarySelection && remaining.length > 0) {
        return remaining.map((candidate, index) => ({
          ...candidate,
          isPrimary: index === 0,
        }))
      }
      return remaining
    })
  }

  function selectPrimary(itemId: string): void {
    setItems((current) =>
      current.map((item) => ({ ...item, isPrimary: item.id === itemId })),
    )
  }

  function validateAllItems(): boolean {
    let isValid = true
    setItems((current) =>
      current.map((item) => {
        if (item.state === 'uploaded') {
          return item
        }
        const errorMessage = validateUploadItem(item, {
          allowedMimeTypes,
          descriptionField,
          maxBytes,
          normalizedDescription: normalizeDescription(item.description),
        })
        if (errorMessage) {
          isValid = false
        }
        return {
          ...item,
          errorMessage,
          state: errorMessage ? 'failed' : item.state === 'failed' ? 'ready' : item.state,
        }
      }),
    )
    return isValid
  }

  async function uploadItems(
    itemIds: readonly string[],
  ): Promise<MediaUploadSummary> {
    if (isUploadingRef.current || isDisabled) {
      return { attemptedCount: 0, failedCount: 0, uploadedCount: 0 }
    }

    isUploadingRef.current = true
    setIsUploading(true)
    let attemptedCount = 0
    let failedCount = 0
    let uploadedCount = 0

    try {
      for (const itemId of itemIds) {
        const item = itemsRef.current.find(
          (candidate) => candidate.id === itemId,
        )
        if (!item || item.state === 'uploaded') {
          continue
        }

        attemptedCount += 1
        if (await uploadItem(item)) {
          uploadedCount += 1
        } else {
          failedCount += 1
        }
      }
    } finally {
      isUploadingRef.current = false
      setIsUploading(false)
    }

    return { attemptedCount, failedCount, uploadedCount }
  }

  async function uploadItem(item: UploadItem): Promise<boolean> {
    const normalizedDescription = normalizeDescription(item.description)
    const validationError = validateUploadItem(item, {
      allowedMimeTypes,
      descriptionField,
      maxBytes,
      normalizedDescription,
    })

    if (validationError) {
      updateItem(item.id, {
        errorMessage: validationError,
        state: 'failed',
      })
      return false
    }

    updateItem(item.id, { errorMessage: null, state: 'uploading' })

    try {
      await onUpload({
        description: normalizedDescription || null,
        file: item.file,
      })
      updateItem(item.id, {
        description: normalizedDescription,
        errorMessage: null,
        state: 'uploaded',
      })
      return true
    } catch (error) {
      updateItem(item.id, {
        errorMessage: formatUploadError(error),
        state: 'failed',
      })
      return false
    }
  }

  function updateItem(
    itemId: string,
    change: Partial<Pick<UploadItem, 'description' | 'errorMessage' | 'state'>>,
  ): void {
    setItems((current) =>
      current.map((item) =>
        item.id === itemId ? { ...item, ...change } : item,
      ),
    )
  }

  const pendingCount = items.filter((item) => item.state === 'ready').length
  const failedCount = items.filter((item) => item.state === 'failed').length
  const uploadedCount = items.filter((item) => item.state === 'uploaded').length

  return (
    <section
      aria-busy={isUploading}
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
          disabled={isDisabled || isUploading}
          id={inputId}
          multiple
          onChange={handleSelection}
          type="file"
        />
      </div>

      <p aria-live="polite" className="sr-only">
        {createQueueAnnouncement({ failedCount, pendingCount, uploadedCount })}
      </p>

      {items.length > 0 ? (
        <ul aria-label="Upload-Warteschlange" className="mt-6 space-y-4">
          {items.map((item) => {
            const isItemDisabled = isDisabled || isUploading
            const itemError =
              item.errorMessage ??
              validateUploadItem(item, {
                allowedMimeTypes,
                descriptionField,
                maxBytes,
                normalizedDescription: normalizeDescription(item.description),
              })

            return (
              <li
                className="border-outline-variant bg-surface-container-lowest rounded-xl border p-4"
                key={item.id}
              >
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
                        errorMessage={itemError}
                        isDisabled={isItemDisabled || item.state === 'uploaded'}
                        isInvalid={Boolean(itemError)}
                        isRequired={descriptionField.required}
                        label={`${descriptionField.label} für ${item.file.name}`}
                        maxLength={descriptionField.maxLength}
                        onChange={(value) => updateDescription(item.id, value)}
                        placeholder={descriptionField.placeholder}
                        rows={3}
                        value={item.description}
                      />
                    ) : itemError ? (
                      <p className="text-error text-sm font-medium" role="alert">
                        {itemError}
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
                            isDisabled={isItemDisabled || item.state === 'uploaded'}
                            onPress={() => selectPrimary(item.id)}
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
                      {item.state === 'failed' && showUploadAction ? (
                        <Button
                          aria-label={`Erneut versuchen: ${item.file.name}`}
                          isDisabled={isItemDisabled}
                          onPress={() => void uploadItems([item.id])}
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
                        isDisabled={isItemDisabled || item.state === 'uploading'}
                        onPress={() => removeItem(item.id)}
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
          })}
        </ul>
      ) : (
        <p className="text-on-surface-variant mt-5 text-sm leading-6">
          Noch keine Dateien ausgewählt.
        </p>
      )}

      {items.length > 0 ? (
        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-on-surface-variant text-sm">
            {uploadedCount} hochgeladen, {failedCount} fehlgeschlagen,{' '}
            {pendingCount} ausstehend
          </p>
          {showUploadAction ? (
            <Button
              isDisabled={isDisabled || isUploading || !hasUploadableItems}
              onPress={() =>
                void uploadItems(createUploadOrder(itemsRef.current))
              }
              type="button"
            >
              <Upload aria-hidden="true" size={18} />
              {isUploading ? 'Bilder werden hochgeladen …' : 'Bilder hochladen'}
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

function UploadPreview({ item }: Readonly<{ item: UploadItem }>) {
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

function UploadStateLabel({ state }: Readonly<{ state: UploadState }>) {
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

function createUploadItem(
  file: File,
  previewUrls: Set<string>,
  isPrimary: boolean,
): UploadItem {
  uploadItemSequence += 1
  const previewUrl = createPreviewUrl(file)
  if (previewUrl) {
    previewUrls.add(previewUrl)
  }

  return {
    description: '',
    errorMessage: null,
    file,
    id: `media-upload-${uploadItemSequence}`,
    isPrimary,
    previewUrl,
    state: 'ready',
  }
}


function createUploadOrder(items: readonly UploadItem[]): string[] {
  return items
    .filter((item) => item.state !== 'uploaded')
    .toSorted((left, right) => Number(right.isPrimary) - Number(left.isPrimary))
    .map((item) => item.id)
}

function createPreviewUrl(file: File): string | null {
  if (
    !file.type.startsWith('image/') ||
    typeof URL.createObjectURL !== 'function'
  ) {
    return null
  }

  return URL.createObjectURL(file)
}

function revokePreviewUrl(previewUrl: string, previewUrls: Set<string>): void {
  if (previewUrls.delete(previewUrl)) {
    URL.revokeObjectURL(previewUrl)
  }
}

function normalizeDescription(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function validateUploadItem(
  item: UploadItem,
  options: Readonly<{
    allowedMimeTypes?: readonly string[]
    descriptionField?: MediaUploadDescriptionField
    maxBytes?: number
    normalizedDescription: string
  }>,
): string | null {
  if (
    options.allowedMimeTypes &&
    !options.allowedMimeTypes.includes(item.file.type)
  ) {
    return 'Dieser Dateityp wird nicht unterstützt.'
  }

  if (item.file.size === 0) {
    return 'Die ausgewählte Datei ist leer.'
  }

  if (options.maxBytes !== undefined && item.file.size > options.maxBytes) {
    return `Die Datei darf höchstens ${formatDisplayFileSize(options.maxBytes)} groß sein.`
  }

  if (options.descriptionField?.required && !options.normalizedDescription) {
    return `${options.descriptionField.label} ist erforderlich.`
  }

  if (
    options.descriptionField?.maxLength !== undefined &&
    options.normalizedDescription.length > options.descriptionField.maxLength
  ) {
    return `${options.descriptionField.label} darf höchstens ${options.descriptionField.maxLength} Zeichen enthalten.`
  }

  return null
}

function createQueueAnnouncement({
  failedCount,
  pendingCount,
  uploadedCount,
}: Readonly<{
  failedCount: number
  pendingCount: number
  uploadedCount: number
}>): string {
  return `Upload-Warteschlange: ${uploadedCount} hochgeladen, ${failedCount} fehlgeschlagen, ${pendingCount} ausstehend.`
}
