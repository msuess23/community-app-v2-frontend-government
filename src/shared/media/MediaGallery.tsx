import { ChevronLeft, ChevronRight, Eye, X } from 'lucide-react'
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type SyntheticEvent,
} from 'react'

import { MediaImage } from '@/shared/media/MediaImage'
import type { MediaAsset } from '@/shared/media/media-model'
import { Button } from '@/shared/ui/Button'

export interface MediaGalleryProps {
  assets: readonly MediaAsset[]
  emptyMessage?: string
  label?: string
  layout?: 'carousel' | 'grid'
  renderActions?: (asset: MediaAsset) => ReactNode
}

/**
 * Displays a static grid or a named, non-rotating carousel. The carousel keeps
 * every slide in the DOM and supports scrolling, swiping and explicit controls.
 */
export function MediaGallery({
  assets,
  emptyMessage = 'Für diese Mitteilung wurden keine Bilder veröffentlicht.',
  label = 'Bilder der Mitteilung',
  layout = 'grid',
  renderActions,
}: MediaGalleryProps) {
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null)
  const [canScrollBack, setCanScrollBack] = useState(false)
  const [canScrollForward, setCanScrollForward] = useState(false)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const carouselRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const selectedIndex = selectedAsset
    ? assets.findIndex((asset) => asset.id === selectedAsset.id)
    : -1

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

  useEffect(() => {
    if (layout !== 'carousel') {
      return
    }

    const carousel = carouselRef.current
    if (!carousel) {
      return
    }

    const update = () =>
      updateScrollState(carousel, setCanScrollBack, setCanScrollForward)
    const frame = window.requestAnimationFrame(update)
    window.addEventListener('resize', update)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', update)
    }
  }, [assets.length, layout])

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
      return
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      selectAdjacent(-1)
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      selectAdjacent(1)
    }
  }

  function selectAdjacent(direction: -1 | 1): void {
    if (selectedIndex < 0) {
      return
    }
    const nextIndex = selectedIndex + direction
    if (nextIndex >= 0 && nextIndex < assets.length) {
      setSelectedAsset(assets[nextIndex])
    }
  }

  function scrollGallery(direction: -1 | 1): void {
    const carousel = carouselRef.current
    if (!carousel) {
      return
    }
    carousel.scrollBy({
      behavior: 'smooth',
      left: direction * Math.max(carousel.clientWidth * 0.8, 280),
    })
  }

  const gallery =
    layout === 'carousel' ? (
      <section
        aria-label={label}
        aria-roledescription="Karussell"
        role="region"
      >
        {assets.length > 1 ? (
          <div
            aria-label="Karussellsteuerung"
            className="mb-3 flex justify-end gap-2"
            role="group"
          >
            <Button
              aria-label="Zu vorherigen Bildern scrollen"
              isDisabled={!canScrollBack}
              onPress={() => scrollGallery(-1)}
              size="sm"
              type="button"
              variant="outline"
            >
              <ChevronLeft aria-hidden="true" size={18} />
            </Button>
            <Button
              aria-label="Zu weiteren Bildern scrollen"
              isDisabled={!canScrollForward}
              onPress={() => scrollGallery(1)}
              size="sm"
              type="button"
              variant="outline"
            >
              <ChevronRight aria-hidden="true" size={18} />
            </Button>
          </div>
        ) : null}

        <div
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-3"
          onScroll={(event) =>
            updateScrollState(
              event.currentTarget,
              setCanScrollBack,
              setCanScrollForward,
            )
          }
          ref={carouselRef}
        >
          {assets.map((asset, index) => (
            <div
              aria-label={`${index + 1} von ${assets.length}`}
              aria-roledescription="Folie"
              className="w-[85vw] max-w-md shrink-0 snap-start sm:w-[22rem] lg:w-[26rem]"
              key={asset.id}
              role="group"
            >
              <GalleryFigure
                asset={asset}
                onOpen={() => setSelectedAsset(asset)}
                renderActions={renderActions}
              />
            </div>
          ))}
        </div>
      </section>
    ) : (
      <ul
        aria-label={label}
        className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3"
      >
        {assets.map((asset) => (
          <li key={asset.id}>
            <GalleryFigure
              asset={asset}
              onOpen={() => setSelectedAsset(asset)}
              renderActions={renderActions}
            />
          </li>
        ))}
      </ul>
    )

  return (
    <>
      {gallery}

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
              className="max-h-[75vh] w-full rounded-xl object-contain"
              key={selectedAsset.id}
              loading="eager"
              url={selectedAsset.url}
            />
            {assets.length > 1 ? (
              <div className="flex items-center justify-between gap-3">
                <Button
                  aria-label="Vorheriges Bild anzeigen"
                  isDisabled={selectedIndex <= 0}
                  onPress={() => selectAdjacent(-1)}
                  variant="outline"
                >
                  <ChevronLeft aria-hidden="true" size={18} />
                  Vorheriges Bild
                </Button>
                <span aria-live="polite" className="text-on-surface-variant text-sm">
                  {selectedIndex + 1} von {assets.length}
                </span>
                <Button
                  aria-label="Nächstes Bild anzeigen"
                  isDisabled={selectedIndex >= assets.length - 1}
                  onPress={() => selectAdjacent(1)}
                  variant="outline"
                >
                  Nächstes Bild
                  <ChevronRight aria-hidden="true" size={18} />
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </dialog>
    </>
  )
}

function GalleryFigure({
  asset,
  onOpen,
  renderActions,
}: Readonly<{
  asset: MediaAsset
  onOpen: () => void
  renderActions?: (asset: MediaAsset) => ReactNode
}>) {
  return (
    <figure className="border-outline-variant bg-surface-container-lowest overflow-hidden rounded-xl border">
      <button
        aria-label={`Bild vergrößern: ${asset.altText ?? asset.originalFilename}`}
        className="focus-visible:outline-primary group relative block w-full overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-2"
        onClick={onOpen}
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
  )
}

function updateScrollState(
  element: HTMLElement,
  setCanScrollBack: (value: boolean) => void,
  setCanScrollForward: (value: boolean) => void,
): void {
  const maximum = element.scrollWidth - element.clientWidth
  setCanScrollBack(element.scrollLeft > 2)
  setCanScrollForward(element.scrollLeft < maximum - 2)
}
