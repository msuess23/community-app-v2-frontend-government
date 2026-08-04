import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type SyntheticEvent,
} from 'react'
import { Eye, X } from 'lucide-react'

import type { MediaAsset } from '@/shared/media/media-model'
import { MediaImage } from '@/shared/media/MediaImage'
import { Button } from '@/shared/ui/Button'

export interface MediaGalleryProps {
  assets: readonly MediaAsset[]
  emptyMessage?: string
  label?: string
  renderActions?: (asset: MediaAsset) => ReactNode
}

/** Displays a responsive image collection and an accessible full-size preview. */
export function MediaGallery({
  assets,
  emptyMessage = 'Für diese Mitteilung wurden keine Bilder veröffentlicht.',
  label = 'Bilder der Mitteilung',
  renderActions,
}: MediaGalleryProps) {
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current

    if (!selectedAsset || !dialog) {
      return
    }

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null

    if (!dialog.open) {
      dialog.showModal()
    }
    closeButtonRef.current?.focus()
  }, [selectedAsset])

  if (assets.length === 0) {
    return <p className="text-on-surface-variant leading-7">{emptyMessage}</p>
  }

  /** Closes the preview and returns focus to the opening thumbnail. */
  function closePreview(): void {
    const dialog = dialogRef.current
    if (dialog?.open) {
      dialog.close()
    }
    setSelectedAsset(null)
    queueMicrotask(() => previousFocusRef.current?.focus())
  }

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>): void {
    event.preventDefault()
    closePreview()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>): void {
    if (event.key === 'Escape') {
      event.preventDefault()
      closePreview()
    }
  }

  return (
    <>
      <ul
        aria-label={label}
        className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3"
      >
        {assets.map((asset) => (
          <li key={asset.id}>
            <figure className="border-outline-variant bg-surface-container-lowest overflow-hidden rounded-xl border">
              <button
                aria-label={`Bild vergrößern: ${asset.altText ?? asset.originalFilename}`}
                className="focus-visible:outline-primary group relative block w-full overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-2"
                onClick={() => setSelectedAsset(asset)}
                type="button"
              >
                <MediaImage
                  altText={asset.altText}
                  className="aspect-video w-full object-cover transition-transform group-hover:scale-[1.02]"
                  url={asset.url}
                />
                <span className="bg-scrim text-on-primary absolute right-2 bottom-2 inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold">
                  <Eye aria-hidden="true" size={16} />
                  Vergrößern
                </span>
              </button>
              <figcaption className="space-y-1 p-3 text-sm">
                <span className="text-on-surface block font-medium">
                  {asset.altText ?? 'Keine Bildbeschreibung verfügbar'}
                </span>
                {asset.isCover ? (
                  <span className="text-on-surface-variant block">Titelbild</span>
                ) : null}
                {renderActions ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {renderActions(asset)}
                  </div>
                ) : null}
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>

      <dialog
        aria-labelledby={titleId}
        aria-modal="true"
        className="backdrop:bg-scrim border-outline-variant bg-surface-container-lowest text-on-surface m-auto w-[calc(100%-2rem)] max-w-6xl rounded-2xl border p-0 shadow-2xl"
        onCancel={handleCancel}
        onKeyDown={handleKeyDown}
        ref={dialogRef}
        role="dialog"
      >
        {selectedAsset ? (
          <div className="space-y-4 p-4 sm:p-6">
            <header className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-1">
                <h2 className="text-xl font-semibold sm:text-2xl" id={titleId}>
                  Bildvorschau
                </h2>
                <p className="text-on-surface-variant leading-6">
                  {selectedAsset.altText ?? selectedAsset.originalFilename}
                </p>
              </div>
              <Button
                aria-label="Bildvorschau schließen"
                onPress={closePreview}
                ref={closeButtonRef}
                size="sm"
                variant="ghost"
              >
                <X aria-hidden="true" size={20} />
              </Button>
            </header>
            <MediaImage
              altText={selectedAsset.altText}
              key={selectedAsset.id}
              className="max-h-[75vh] w-full rounded-xl object-contain"
              loading="eager"
              url={selectedAsset.url}
            />
          </div>
        ) : null}
      </dialog>
    </>
  )
}
