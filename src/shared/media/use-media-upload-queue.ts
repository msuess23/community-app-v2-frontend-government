import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import type {
  MediaUploadItem,
  MediaUploadRequest,
  MediaUploadSummary,
  MediaUploadValidationOptions,
} from '@/shared/media/media-upload-model'
import {
  normalizeMediaDescription,
  validateMediaUploadItem,
} from '@/shared/media/media-upload-validation'

let uploadItemSequence = 0

type QueueOptions = MediaUploadValidationOptions &
  Readonly<{
    formatUploadError: (error: unknown) => string
    isDisabled: boolean
    onPendingChange?: (hasPendingItems: boolean) => void
    onUpload: (request: MediaUploadRequest) => Promise<void>
    supportsPrimarySelection: boolean
  }>

/** Owns queue state, preview URL lifecycle, validation and sequential uploads. */
export function useMediaUploadQueue({
  allowedMimeTypes,
  descriptionField,
  formatUploadError,
  isDisabled,
  maxBytes,
  onPendingChange,
  onUpload,
  supportsPrimarySelection,
}: QueueOptions) {
  const [items, setItemsState] = useState<MediaUploadItem[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const itemsRef = useRef(items)
  const isUploadingRef = useRef(false)
  const previewUrlsRef = useRef(new Set<string>())
  const onPendingChangeRef = useRef(onPendingChange)

  useEffect(() => {
    onPendingChangeRef.current = onPendingChange
  }, [onPendingChange])

  const setItems = useCallback(
    (
      update:
        | MediaUploadItem[]
        | ((current: MediaUploadItem[]) => MediaUploadItem[]),
    ) => {
      const nextItems =
        typeof update === 'function' ? update(itemsRef.current) : update
      itemsRef.current = nextItems
      setItemsState(nextItems)
    },
    [],
  )

  const clearAll = useCallback(() => {
    for (const previewUrl of previewUrlsRef.current) {
      URL.revokeObjectURL(previewUrl)
    }
    previewUrlsRef.current.clear()
    onPendingChangeRef.current?.(false)
    setItems([])
  }, [setItems])

  useEffect(
    () => () => {
      for (const previewUrl of previewUrlsRef.current) {
        URL.revokeObjectURL(previewUrl)
      }
      previewUrlsRef.current.clear()
      onPendingChangeRef.current?.(false)
    },
    [],
  )

  const hasPendingItems = items.some((item) => item.state !== 'uploaded')

  useEffect(() => {
    onPendingChange?.(hasPendingItems)
  }, [hasPendingItems, onPendingChange])

  const addFiles = useCallback(
    (files: readonly File[]) => {
      if (files.length === 0) {
        return
      }

      setItems((current) => [
        ...current,
        ...files.map((file, index) =>
          createUploadItem(
            file,
            previewUrlsRef.current,
            supportsPrimarySelection &&
              !current.some((item) => item.isPrimary) &&
              index === 0,
          ),
        ),
      ])
    },
    [setItems, supportsPrimarySelection],
  )

  const updateDescription = useCallback(
    (itemId: string, description: string) => {
      setItems((current) =>
        current.map((item) =>
          item.id === itemId
            ? {
                ...item,
                description,
                errorMessage:
                  item.state === 'failed' ? null : item.errorMessage,
                state: item.state === 'failed' ? 'ready' : item.state,
              }
            : item,
        ),
      )
    },
    [setItems],
  )

  const removeItem = useCallback(
    (itemId: string) => {
      setItems((current) => {
        const item = current.find((candidate) => candidate.id === itemId)
        if (item?.previewUrl) {
          revokePreviewUrl(item.previewUrl, previewUrlsRef.current)
        }

        const remaining = current.filter(
          (candidate) => candidate.id !== itemId,
        )
        if (
          item?.isPrimary &&
          supportsPrimarySelection &&
          remaining.length > 0
        ) {
          return remaining.map((candidate, index) => ({
            ...candidate,
            isPrimary: index === 0,
          }))
        }
        return remaining
      })
    },
    [setItems, supportsPrimarySelection],
  )

  const selectPrimary = useCallback(
    (itemId: string) => {
      setItems((current) =>
        current.map((item) => ({
          ...item,
          isPrimary: item.id === itemId,
        })),
      )
    },
    [setItems],
  )

  const validationOptions = useMemo<MediaUploadValidationOptions>(
    () => ({ allowedMimeTypes, descriptionField, maxBytes }),
    [allowedMimeTypes, descriptionField, maxBytes],
  )

  const validateAll = useCallback((): boolean => {
    let isValid = true
    setItems((current) =>
      current.map((item) => {
        if (item.state === 'uploaded') {
          return item
        }

        const errorMessage = validateMediaUploadItem(item, validationOptions)
        if (errorMessage) {
          isValid = false
        }
        return {
          ...item,
          errorMessage,
          state: errorMessage
            ? 'failed'
            : item.state === 'failed'
              ? 'ready'
              : item.state,
        }
      }),
    )
    return isValid
  }, [setItems, validationOptions])

  const updateItem = useCallback(
    (
      itemId: string,
      change: Partial<
        Pick<MediaUploadItem, 'description' | 'errorMessage' | 'state'>
      >,
    ) => {
      setItems((current) =>
        current.map((item) =>
          item.id === itemId ? { ...item, ...change } : item,
        ),
      )
    },
    [setItems],
  )

  const uploadItem = useCallback(
    async (item: MediaUploadItem): Promise<boolean> => {
      const validationError = validateMediaUploadItem(item, validationOptions)
      if (validationError) {
        updateItem(item.id, {
          errorMessage: validationError,
          state: 'failed',
        })
        return false
      }

      const normalizedDescription = normalizeMediaDescription(item.description)
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
    },
    [formatUploadError, onUpload, updateItem, validationOptions],
  )

  const uploadItems = useCallback(
    async (itemIds: readonly string[]): Promise<MediaUploadSummary> => {
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
    },
    [isDisabled, uploadItem],
  )

  const uploadAll = useCallback(
    () => uploadItems(createUploadOrder(itemsRef.current)),
    [uploadItems],
  )

  const retryItem = useCallback(
    (itemId: string) => uploadItems([itemId]),
    [uploadItems],
  )

  return {
    addFiles,
    clearAll,
    failedCount: items.filter((item) => item.state === 'failed').length,
    hasPendingItems,
    hasUploadableItems: items.some((item) => item.state !== 'uploaded'),
    isUploading,
    items,
    pendingCount: items.filter((item) => item.state === 'ready').length,
    removeItem,
    retryItem,
    selectPrimary,
    updateDescription,
    uploadedCount: items.filter((item) => item.state === 'uploaded').length,
    uploadAll,
    validateAll,
  }
}

function createUploadItem(
  file: File,
  previewUrls: Set<string>,
  isPrimary: boolean,
): MediaUploadItem {
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

function createUploadOrder(items: readonly MediaUploadItem[]): string[] {
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
