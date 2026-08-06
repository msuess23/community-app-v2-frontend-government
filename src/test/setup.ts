import '@testing-library/jest-dom/vitest'
import { File as NodeFile } from 'node:buffer'
import { afterAll, afterEach, beforeAll } from 'vitest'

import { mockApiServer } from '@/test/server'

const nativeFormDataAppend = FormData.prototype.append

/** Preserves browser-style filenames when native FormData receives Node File objects. */
FormData.prototype.append = function appendFormDataEntry(
  this: FormData,
  name: string,
  value: string | Blob,
  filename?: string,
): void {
  const effectiveFilename =
    filename ??
    (typeof value !== 'string' && 'name' in value
      ? String(value.name)
      : undefined)
  const args =
    effectiveFilename === undefined
      ? [name, value]
      : [name, value, effectiveFilename]

  Reflect.apply(nativeFormDataAppend, this, args)
} as FormData['append']

/** Aligns jsdom file uploads with the native FormData implementation used by fetch. */
Object.defineProperty(globalThis, 'File', {
  configurable: true,
  value: NodeFile,
  writable: true,
})

/** Opens a dialog in jsdom when the browser-native method is unavailable. */
function showModal(this: HTMLDialogElement): void {
  if (this.open) {
    throw new DOMException('The dialog is already open.', 'InvalidStateError')
  }

  this.setAttribute('open', '')
}

/** Closes a dialog in jsdom and emits the browser-compatible close event. */
function closeDialog(this: HTMLDialogElement, returnValue = ''): void {
  this.returnValue = returnValue
  this.removeAttribute('open')
  this.dispatchEvent(new Event('close'))
}

/** Provides visual-frame scheduling for focus lifecycle tests in jsdom. */
if (!window.requestAnimationFrame) {
  window.requestAnimationFrame = (callback: FrameRequestCallback): number =>
    window.setTimeout(() => callback(performance.now()), 0)
  window.cancelAnimationFrame = (handle: number): void =>
    window.clearTimeout(handle)
}

if (typeof HTMLDialogElement !== 'undefined') {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = showModal
  }

  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = closeDialog
  }
}

beforeAll(() => {
  mockApiServer.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  mockApiServer.resetHandlers()
})

afterAll(() => {
  mockApiServer.close()
})
