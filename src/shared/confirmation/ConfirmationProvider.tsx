import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type SyntheticEvent,
} from 'react'

import {
  ConfirmationContext,
  type ConfirmationContextValue,
  type ConfirmationOptions,
} from '@/shared/confirmation/confirmation-context'
import { Button } from '@/shared/ui/Button'

let confirmationSequence = 0

type ConfirmationProviderProps = Readonly<{
  children: ReactNode
}>

type QueuedConfirmation = Readonly<{
  id: string
  options: Required<ConfirmationOptions>
  resolve: (accepted: boolean) => void
}>

/** Coordinates confirmation requests so only one modal decision is shown at a time. */
export function ConfirmationProvider({
  children,
}: ConfirmationProviderProps) {
  const [queue, setQueue] = useState<QueuedConfirmation[]>([])
  const dialogRef = useRef<HTMLDialogElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const confirmButtonRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const queueRef = useRef(queue)
  const settlingRequestRef = useRef<string | undefined>(undefined)
  const activeRequest = queue[0]

  useEffect(() => {
    queueRef.current = queue
  }, [queue])

  /** Enqueues a confirmation and resolves once the user accepts or cancels it. */
  const confirm = useCallback(
    (options: ConfirmationOptions): Promise<boolean> =>
      new Promise((resolve) => {
        setQueue((current) => [
          ...current,
          {
            id: createConfirmationId(),
            options: normalizeConfirmationOptions(options),
            resolve,
          },
        ])
      }),
    [],
  )

  /** Closes the current dialog exactly once and advances the request queue. */
  const settleActiveRequest = useCallback(
    (accepted: boolean): void => {
      if (!activeRequest || settlingRequestRef.current === activeRequest.id) {
        return
      }

      settlingRequestRef.current = activeRequest.id

      if (dialogRef.current?.open) {
        dialogRef.current.close()
      }

      activeRequest.resolve(accepted)
      setQueue((current) => current.slice(1))

      // Keep the guard through the current event turn so cancel and key events cannot resolve twice.
      queueMicrotask(() => {
        settlingRequestRef.current = undefined
      })
    },
    [activeRequest],
  )

  useEffect(() => {
    const dialog = dialogRef.current

    if (!activeRequest || !dialog) {
      return
    }

    if (!previousFocusRef.current) {
      previousFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null
    }

    if (!dialog.open) {
      dialog.showModal()
    }

    const initialFocus =
      activeRequest.options.initialFocus === 'confirm'
        ? confirmButtonRef.current
        : cancelButtonRef.current
    initialFocus?.focus()
  }, [activeRequest])

  useEffect(() => {
    if (activeRequest || !previousFocusRef.current) {
      return
    }

    const focusTarget = previousFocusRef.current
    previousFocusRef.current = null

    // Restore focus only after the final queued dialog has left the DOM state.
    queueMicrotask(() => {
      focusTarget.focus()
    })
  }, [activeRequest])

  useEffect(
    () => () => {
      // Unmounting must not leave feature code waiting on unresolved promises.
      for (const request of queueRef.current) {
        request.resolve(false)
      }
    },
    [],
  )

  const value = useMemo<ConfirmationContextValue>(
    () => ({ confirm }),
    [confirm],
  )

  /** Treats the native dialog cancellation event as an explicit rejection. */
  function handleCancel(event: SyntheticEvent<HTMLDialogElement>): void {
    event.preventDefault()
    settleActiveRequest(false)
  }

  /** Provides deterministic Escape handling in browsers and DOM-based tests. */
  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>): void {
    if (event.key !== 'Escape') {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    settleActiveRequest(false)
  }

  return (
    <ConfirmationContext.Provider value={value}>
      {children}
      <dialog
        aria-describedby="global-confirmation-description"
        aria-labelledby="global-confirmation-title"
        aria-modal="true"
        className="backdrop:bg-scrim border-outline-variant bg-surface-container-lowest text-on-surface m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border p-0 shadow-2xl"
        onCancel={handleCancel}
        onKeyDown={handleKeyDown}
        ref={dialogRef}
        role="dialog"
      >
        {activeRequest ? (
          <div className="p-5 sm:p-6">
            <h2
              className="text-xl font-semibold tracking-tight sm:text-2xl"
              id="global-confirmation-title"
            >
              {activeRequest.options.title}
            </h2>
            <p
              className="text-on-surface-variant mt-3 leading-7"
              id="global-confirmation-description"
            >
              {activeRequest.options.description}
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                onPress={() => settleActiveRequest(false)}
                ref={cancelButtonRef}
                variant="outline"
              >
                {activeRequest.options.cancelLabel}
              </Button>
              <Button
                onPress={() => settleActiveRequest(true)}
                ref={confirmButtonRef}
                variant={
                  activeRequest.options.tone === 'danger' ? 'danger' : 'primary'
                }
              >
                {activeRequest.options.confirmLabel}
              </Button>
            </div>
          </div>
        ) : null}
      </dialog>
    </ConfirmationContext.Provider>
  )
}

/** Fills optional labels and safe focus defaults for every confirmation request. */
function normalizeConfirmationOptions(
  options: ConfirmationOptions,
): Required<ConfirmationOptions> {
  return {
    cancelLabel: options.cancelLabel ?? 'Abbrechen',
    confirmLabel: options.confirmLabel ?? 'Bestätigen',
    description: options.description,
    initialFocus: options.initialFocus ?? 'cancel',
    title: options.title,
    tone: options.tone ?? 'default',
  }
}

/** Creates a deterministic identifier for queue bookkeeping and double-submit guards. */
function createConfirmationId(): string {
  confirmationSequence += 1
  return `confirmation-${confirmationSequence}`
}
