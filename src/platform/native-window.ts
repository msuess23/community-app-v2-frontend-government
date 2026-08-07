import { isTauri } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'

export type NativeWindowCloseEvent = Readonly<{
  preventDefault: () => void
}>

export type NativeWindowCloseHandler = (
  event: NativeWindowCloseEvent,
) => Promise<void> | void

/** Registers a native close-request listener only when the SPA runs inside Tauri. */
export async function listenForNativeWindowClose(
  handler: NativeWindowCloseHandler,
): Promise<() => void> {
  if (!isTauri()) {
    return () => undefined
  }

  return getCurrentWindow().onCloseRequested(handler)
}

/** Destroys the Tauri window after the user has already confirmed discarding changes. */
export async function destroyNativeWindow(): Promise<void> {
  if (!isTauri()) {
    return
  }

  await getCurrentWindow().destroy()
}
