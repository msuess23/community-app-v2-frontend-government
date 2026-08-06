import { useCallback, useEffect, useRef } from 'react'
import { useBeforeUnload, useBlocker, type BlockerFunction } from 'react-router'

import {
  useConfirmation,
  type ConfirmationOptions,
} from '@/shared/confirmation/confirmation-context'

export type UnsavedChangesMessage = Readonly<
  Pick<
    ConfirmationOptions,
    'cancelLabel' | 'confirmLabel' | 'description' | 'title'
  >
>

export type UnsavedChangesGuardOptions = Readonly<{
  hasUnsavedChanges: boolean
  isEnabled?: boolean
  message?: Partial<UnsavedChangesMessage>
}>

export type UnsavedChangesGuard = Readonly<{
  allowNextNavigation: () => void
  confirmDiscardChanges: (
    message?: Partial<UnsavedChangesMessage>,
  ) => Promise<boolean>
}>

const defaultMessage: UnsavedChangesMessage = {
  cancelLabel: 'Weiter bearbeiten',
  confirmLabel: 'Änderungen verwerfen',
  description:
    'Deine Änderungen wurden noch nicht gespeichert. Wenn du die Seite verlässt, gehen sie verloren.',
  title: 'Ungespeicherte Änderungen verwerfen?',
}

/** Protects dirty forms from in-app navigation and browser-level page exits. */
export function useUnsavedChangesGuard({
  hasUnsavedChanges,
  isEnabled = true,
  message,
}: UnsavedChangesGuardOptions): UnsavedChangesGuard {
  const { confirm } = useConfirmation()
  const shouldProtect = isEnabled && hasUnsavedChanges
  const handledNavigationRef = useRef<string | null>(null)
  const pendingConfirmationRef = useRef(false)
  const allowNextNavigationRef = useRef(false)
  const messageRef = useRef(message)

  useEffect(() => {
    messageRef.current = message
  }, [message])

  const shouldBlock = useCallback<BlockerFunction>(
    ({ currentLocation, nextLocation }) => {
      if (
        serializeLocation(currentLocation) === serializeLocation(nextLocation)
      ) {
        return false
      }

      if (allowNextNavigationRef.current) {
        return false
      }

      return shouldProtect
    },
    [shouldProtect],
  )
  const blocker = useBlocker(shouldBlock)
  const blockerRef = useRef(blocker)

  useEffect(() => {
    blockerRef.current = blocker
  }, [blocker])

  const blockedLocationKey =
    blocker.state === 'blocked' ? serializeLocation(blocker.location) : null

  const allowNextNavigation = useCallback(() => {
    allowNextNavigationRef.current = true
    queueMicrotask(() => {
      allowNextNavigationRef.current = false
    })
  }, [])

  const confirmDiscardChanges = useCallback(
    (overrideMessage: Partial<UnsavedChangesMessage> = {}) => {
      if (!shouldProtect) {
        return Promise.resolve(true)
      }

      return confirm({
        ...defaultMessage,
        ...messageRef.current,
        ...overrideMessage,
        tone: 'danger',
      })
    },
    [confirm, shouldProtect],
  )

  useBeforeUnload(
    useCallback(
      (event: BeforeUnloadEvent) => {
        if (!shouldProtect) {
          return
        }

        // Browsers intentionally replace custom copy with their own page-exit warning.
        event.preventDefault()
        event.returnValue = ''
      },
      [shouldProtect],
    ),
    { capture: true },
  )

  useEffect(() => {
    if (blocker.state !== 'blocked') {
      handledNavigationRef.current = null
      return
    }

    if (
      !blockedLocationKey ||
      pendingConfirmationRef.current ||
      handledNavigationRef.current === blockedLocationKey
    ) {
      return
    }

    handledNavigationRef.current = blockedLocationKey
    pendingConfirmationRef.current = true

    // Read the latest blocker after the asynchronous confirmation resolves.
    void confirmDiscardChanges().then((accepted) => {
      pendingConfirmationRef.current = false
      const currentBlocker = blockerRef.current

      if (currentBlocker.state !== 'blocked') {
        return
      }

      if (accepted) {
        currentBlocker.proceed()
      } else {
        currentBlocker.reset()
      }
    })
  }, [blockedLocationKey, blocker.state, confirmDiscardChanges])

  return { allowNextNavigation, confirmDiscardChanges }
}

/** Creates a stable comparison key for router locations, including query and hash state. */
function serializeLocation(location: {
  hash: string
  pathname: string
  search: string
}): string {
  return `${location.pathname}${location.search}${location.hash}`
}
