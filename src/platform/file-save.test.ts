import { isTauri } from '@tauri-apps/api/core'
import { save } from '@tauri-apps/plugin-dialog'
import { writeFile } from '@tauri-apps/plugin-fs'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { saveBlobAsFile } from '@/platform/file-save'

vi.mock('@tauri-apps/api/core', () => ({ isTauri: vi.fn() }))
vi.mock('@tauri-apps/plugin-dialog', () => ({ save: vi.fn() }))
vi.mock('@tauri-apps/plugin-fs', () => ({ writeFile: vi.fn() }))

const originalCreateObjectUrl = Object.getOwnPropertyDescriptor(
  URL,
  'createObjectURL',
)
const originalRevokeObjectUrl = Object.getOwnPropertyDescriptor(
  URL,
  'revokeObjectURL',
)

describe('saveBlobAsFile', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.mocked(isTauri).mockReset()
    vi.mocked(save).mockReset()
    vi.mocked(writeFile).mockReset()
    restoreUrlMethod('createObjectURL', originalCreateObjectUrl)
    restoreUrlMethod('revokeObjectURL', originalRevokeObjectUrl)
  })

  it('keeps the browser download flow outside Tauri', async () => {
    vi.mocked(isTauri).mockReturnValue(false)
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

    await saveBlobAsFile(
      new Blob(['pdf'], { type: 'application/pdf' }),
      'notice.pdf',
    )

    expect(createObjectUrl).toHaveBeenCalledOnce()
    expect(click).toHaveBeenCalledOnce()
    expect(document.querySelector('a[download="notice.pdf"]')).toBeNull()
    expect(save).not.toHaveBeenCalled()
    expect(writeFile).not.toHaveBeenCalled()

    vi.runAllTimers()
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:appointment-document')
  })

  it('uses the native save dialog and writes the selected Tauri file', async () => {
    vi.mocked(isTauri).mockReturnValue(true)
    vi.mocked(save).mockResolvedValue('/tmp/notice.pdf')
    const blob = new Blob(['pdf'], { type: 'application/pdf' })

    await saveBlobAsFile(blob, 'notice.pdf')

    expect(save).toHaveBeenCalledWith({
      defaultPath: 'notice.pdf',
      filters: [{ extensions: ['pdf'], name: 'PDF-Datei' }],
      title: 'Datei speichern',
    })
    expect(writeFile).toHaveBeenCalledOnce()
    const [path, bytes] = vi.mocked(writeFile).mock.calls[0]
    expect(path).toBe('/tmp/notice.pdf')
    expect(bytes).toEqual(new Uint8Array(await blob.arrayBuffer()))
  })

  it('does not write a file when the native save dialog is cancelled', async () => {
    vi.mocked(isTauri).mockReturnValue(true)
    vi.mocked(save).mockResolvedValue(null)

    await saveBlobAsFile(
      new Blob(['pdf'], { type: 'application/pdf' }),
      'notice.pdf',
    )

    expect(writeFile).not.toHaveBeenCalled()
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
