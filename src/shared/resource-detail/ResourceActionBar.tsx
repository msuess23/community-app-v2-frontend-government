import { X } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type SyntheticEvent,
} from 'react'

import {
  ResourceActionDialogContext,
  type ResourceActionDialogContextValue,
} from '@/shared/resource-detail/resource-action-dialog-context'
import {
  resolveAllowedResourceActions,
  type ResourceActionCloseGuard,
  type ResourceActionDefinition,
  type ResourceActionRegistry,
} from '@/shared/resource-detail/resource-action-registry'
import { Button, type ButtonProps } from '@/shared/ui/Button'

type ButtonPressEvent = Parameters<NonNullable<ButtonProps['onPress']>>[0]

export interface ResourceActionBarProps<TAction extends string> {
  allowedActions: ReadonlyArray<string>
  ariaLabel?: string
  emptyMessage?: ReactNode
  onUnknownActions?: (actions: ReadonlyArray<string>) => void
  registry: ResourceActionRegistry<TAction>
}

/** Renders only server-allowed resource actions and opens their registered workflow panel. */
export function ResourceActionBar<TAction extends string>({
  allowedActions,
  ariaLabel = 'Verfügbare Aktionen',
  emptyMessage = 'Für den aktuellen Stand sind keine Aktionen verfügbar.',
  onUnknownActions,
  registry,
}: ResourceActionBarProps<TAction>) {
  const { actions, unknownActions } = useMemo(
    () => resolveAllowedResourceActions(allowedActions, registry),
    [allowedActions, registry],
  )
  const [selectedAction, setSelectedAction] =
    useState<ResourceActionDefinition<TAction> | null>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const selectedActionIsAvailable =
    selectedAction === null ||
    actions.some((action) => action.action === selectedAction.action)

  useEffect(() => {
    if (unknownActions.length === 0) {
      return
    }

    if (onUnknownActions) {
      onUnknownActions(unknownActions)
      return
    }

    if (import.meta.env.DEV) {
      console.warn(
        'The backend exposed resource actions without a registered UI handler:',
        unknownActions,
      )
    }
  }, [onUnknownActions, unknownActions])

  useEffect(() => {
    if (selectedAction || !previousFocusRef.current) {
      return
    }

    const focusTarget = previousFocusRef.current
    previousFocusRef.current = null
    queueMicrotask(() => focusTarget.focus())
  }, [selectedAction])

  /** Stores the exact trigger so focus can return after the workflow closes. */
  function openAction(
    action: ResourceActionDefinition<TAction>,
    trigger: Element,
  ): void {
    previousFocusRef.current =
      trigger instanceof HTMLElement
        ? trigger
        : document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null
    setSelectedAction(action)
  }

  /** Clears the selected workflow after its dialog has closed. */
  const closeAction = useCallback(() => {
    setSelectedAction(null)
  }, [])

  return (
    <>
      {actions.length > 0 ? (
        <div aria-label={ariaLabel} className="flex flex-wrap gap-2" role="group">
          {actions.map((action) => (
            <Button
              key={action.action}
              onPress={(event: ButtonPressEvent) =>
                openAction(action, event.target)
              }
              variant={action.buttonVariant ?? 'outline'}
            >
              {action.icon}
              {action.label}
            </Button>
          ))}
        </div>
      ) : (
        <p className="text-on-surface-variant leading-7">{emptyMessage}</p>
      )}

      <ResourceActionDialog
        action={selectedAction}
        isAvailable={selectedActionIsAvailable}
        key={selectedAction?.action ?? 'closed'}
        onClose={closeAction}
      />
    </>
  )
}

interface ResourceActionDialogProps<TAction extends string> {
  action: ResourceActionDefinition<TAction> | null
  isAvailable: boolean
  onClose: () => void
}

/** Hosts one action workflow in a modal and restores safe keyboard behavior. */
function ResourceActionDialog<TAction extends string>({
  action,
  isAvailable,
  onClose,
}: ResourceActionDialogProps<TAction>) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const closeGuardRef = useRef<ResourceActionCloseGuard | null>(null)
  const closeRequestPendingRef = useRef(false)
  const dialogId = useId()
  const titleId = `${dialogId}-title`
  const descriptionId = action?.description
    ? `${dialogId}-description`
    : undefined

  useEffect(() => {
    const dialog = dialogRef.current

    if (!action || !dialog) {
      if (dialog?.open) {
        dialog.close()
      }
      return
    }

    if (!dialog.open) {
      dialog.showModal()
    }

    // The close action is always safe, even before a feature form has mounted.
    requestAnimationFrame(() => closeButtonRef.current?.focus())
  }, [action])

  /** Closes both the native modal and selected action after a successful workflow. */
  const close = useCallback(() => {
    const dialog = dialogRef.current
    if (dialog?.open) {
      dialog.close()
    }
    onClose()
  }, [onClose])

  /** Registers the feature form check used by Escape and explicit close actions. */
  const registerCloseGuard = useCallback(
    (guard: ResourceActionCloseGuard | null): void => {
      closeGuardRef.current = guard
    },
    [],
  )

  const dialogContext = useMemo<ResourceActionDialogContextValue>(
    () => ({ close, registerCloseGuard }),
    [close, registerCloseGuard],
  )

  /** Requests a guarded close and serializes repeated dismissal gestures. */
  const requestClose = useCallback(async (): Promise<void> => {
    if (closeRequestPendingRef.current) {
      return
    }

    closeRequestPendingRef.current = true

    try {
      const canClose = (await closeGuardRef.current?.()) ?? true
      if (canClose) {
        close()
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('The resource action close guard failed.', error)
      }
    } finally {
      closeRequestPendingRef.current = false
    }
  }, [close])

  /** Maps the browser-native cancellation gesture to the guarded close path. */
  function handleCancel(event: SyntheticEvent<HTMLDialogElement>): void {
    event.preventDefault()
    void requestClose()
  }

  /** Provides deterministic Escape support in browsers and DOM-based tests. */
  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>): void {
    if (event.key !== 'Escape') {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    void requestClose()
  }

  return (
    <dialog
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      aria-modal="true"
      className="backdrop:bg-scrim border-outline-variant bg-surface-container-lowest text-on-surface m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border p-0 shadow-2xl"
      onCancel={handleCancel}
      onKeyDown={handleKeyDown}
      ref={dialogRef}
      role="dialog"
    >
      {action ? (
        <div className="p-5 sm:p-6">
          <header className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <h2
                className="text-xl font-semibold tracking-tight sm:text-2xl"
                id={titleId}
              >
                {action.dialogTitle}
              </h2>
              {action.description ? (
                <div
                  className="text-on-surface-variant leading-7"
                  id={descriptionId}
                >
                  {action.description}
                </div>
              ) : null}
            </div>
            <Button
              aria-label="Aktionsdialog schließen"
              onPress={() => void requestClose()}
              ref={closeButtonRef}
              size="sm"
              variant="ghost"
            >
              <X aria-hidden="true" size={20} />
            </Button>
          </header>

          <div className="mt-6">
            {isAvailable ? (
              <ResourceActionDialogContext.Provider value={dialogContext}>
                {action.render({ action: action.action })}
              </ResourceActionDialogContext.Provider>
            ) : (
              <div
                className="border-secondary bg-secondary-container text-on-secondary-container rounded-lg border p-4"
                role="alert"
              >
                <p className="font-semibold">Aktion nicht mehr verfügbar</p>
                <p className="mt-2 leading-7">
                  Der Ressourcenstand wurde zwischenzeitlich aktualisiert. Schließe
                  den Dialog und prüfe die jetzt verfügbaren Aktionen.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </dialog>
  )
}
