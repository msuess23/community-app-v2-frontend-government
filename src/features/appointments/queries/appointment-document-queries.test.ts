import { afterEach, describe, expect, it, vi } from 'vitest'

import { triggerBlobDownload } from '@/features/appointments/queries/appointment-document-queries'

const originalCreateObjectUrl = Object.getOwnPropertyDescriptor(
  URL,
  'createObjectURL',
)
const originalRevokeObjectUrl = Object.getOwnPropertyDescriptor(
  URL,
  'revokeObjectURL',
)

describe('appointment document download', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    restoreUrlMethod('createObjectURL', originalCreateObjectUrl)
    restoreUrlMethod('revokeObjectURL', originalRevokeObjectUrl)
  })

  it('uses the original filename and revokes the temporary object URL', () => {
    vi.useFakeTimers()
    const createObjectUrl = vi.fn(() => 'blob:appointment-document')
    const revokeObjectUrl = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectUrl,
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectUrl,
    })
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined)

    triggerBlobDownload(
      new Blob(['pdf'], { type: 'application/pdf' }),
      'notice.pdf',
    )

    expect(createObjectUrl).toHaveBeenCalledOnce()
    expect(click).toHaveBeenCalledOnce()
    expect(document.querySelector('a[download="notice.pdf"]')).toBeNull()

    vi.runAllTimers()
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:appointment-document')
  })
})

function restoreUrlMethod(
  name: 'createObjectURL' | 'revokeObjectURL',
  descriptor: PropertyDescriptor | undefined,
): void {
  if (descriptor) {
    Object.defineProperty(URL, name, descriptor)
  } else {
    Reflect.deleteProperty(URL, name)
  }
}
