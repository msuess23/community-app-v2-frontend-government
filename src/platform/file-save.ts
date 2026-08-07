import { isTauri } from '@tauri-apps/api/core'
import { save } from '@tauri-apps/plugin-dialog'
import { writeFile } from '@tauri-apps/plugin-fs'

/** Saves a downloaded blob using the native Tauri save dialog or the browser download flow. */
export async function saveBlobAsFile(
  blob: Blob,
  filename: string,
): Promise<void> {
  if (!isTauri()) {
    triggerBrowserBlobDownload(blob, filename)
    return
  }

  const selectedPath = await save({
    defaultPath: filename,
    filters: createFilenameFilter(filename),
    title: 'Datei speichern',
  })

  if (!selectedPath) {
    return
  }

  await writeFile(selectedPath, new Uint8Array(await blob.arrayBuffer()))
}

/** Creates a temporary object URL and always releases it after the browser consumes the click. */
export function triggerBrowserBlobDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  anchor.hidden = true
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
}

function createFilenameFilter(
  filename: string,
): Array<{ extensions: string[]; name: string }> | undefined {
  const extension = filename.match(/\.([^.]+)$/)?.[1]?.trim()
  if (!extension) {
    return undefined
  }

  return [{ extensions: [extension], name: `${extension.toUpperCase()}-Datei` }]
}
