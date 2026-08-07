import { useEffect, useRef } from 'react'

import {
  destroyNativeWindow,
  listenForNativeWindowClose,
} from '@/platform/native-window'

type NativeUnsavedChangesCloseGuardOptions = Readonly<{
  confirmDiscardChanges: () => Promise<boolean>
  shouldProtect: boolean
}>

/** Extends the browser/router dirty-form guard to the native Tauri window close button. */
export function useNativeUnsavedChangesCloseGuard({
  confirmDiscardChanges,
  shouldProtect,
}: NativeUnsavedChangesCloseGuardOptions): void {
  const shouldProtectRef = useRef(shouldProtect)
  const confirmDiscardChangesRef = useRef(confirmDiscardChanges)
  const pendingConfirmationRef = useRef(false)

  useEffect(() => {
    shouldProtectRef.current = shouldProtect
  }, [shouldProtect])

  useEffect(() => {
    confirmDiscardChangesRef.current = confirmDiscardChanges
  }, [confirmDiscardChanges])

  useEffect(() => {
    let isDisposed = false
    let unlisten: (() => void) | undefined

    void listenForNativeWindowClose(async (event) => {
      if (!shouldProtectRef.current) {
        return
      }

      // Stop the native close immediately so the existing React confirmation can be shown safely.
      event.preventDefault()

      if (pendingConfirmationRef.current) {
        return
      }

      pendingConfirmationRef.current = true
      try {
        const accepted = await confirmDiscardChangesRef.current()
        if (!accepted) {
          return
        }

        // The user already confirmed the destructive action. Destroying the native window
        // avoids emitting a second close-request event and therefore cannot recurse through
        // this guard or the browser-level beforeunload protection.
        await destroyNativeWindow()
      } finally {
        pendingConfirmationRef.current = false
      }
    })
      .then((registeredUnlisten) => {
        if (isDisposed) {
          registeredUnlisten()
        } else {
          unlisten = registeredUnlisten
        }
      })
      .catch(() => undefined)

    return () => {
      isDisposed = true
      unlisten?.()
    }
  }, [])
}
