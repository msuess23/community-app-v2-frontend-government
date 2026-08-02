import '@testing-library/jest-dom/vitest'

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

if (typeof HTMLDialogElement !== 'undefined') {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = showModal
  }

  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = closeDialog
  }
}
