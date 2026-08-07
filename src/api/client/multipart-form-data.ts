/**
 * Appends a Blob/File to FormData and preserves the supplied filename.
 *
 * Browser files can originate from another realm (for example an iframe or a
 * jsdom window). FormData implementations may accept such values but serialize
 * them as plain strings instead of binary parts. Foreign Blobs are therefore
 * copied into the FormData realm before they are appended.
 */
export async function appendFileToFormData(
  formData: FormData,
  fieldName: string,
  file: Blob,
  filename: string,
): Promise<void> {
  const CompatibleBlob = getCompatibleBlobConstructor(formData)
  const fileType = file.type
  const compatibleFile =
    file instanceof CompatibleBlob
      ? file
      : new CompatibleBlob(
          [await (file as Blob & { arrayBuffer(): Promise<ArrayBuffer> }).arrayBuffer()],
          { type: fileType },
        )

  try {
    formData.append(fieldName, compatibleFile, filename)
  } catch (initialError) {
    if (compatibleFile !== file) throw initialError

    try {
      const copiedFile = new CompatibleBlob(
        [await (file as Blob & { arrayBuffer(): Promise<ArrayBuffer> }).arrayBuffer()],
        {
          type: fileType,
        },
      )
      formData.append(fieldName, copiedFile, filename)
    } catch {
      throw initialError
    }
  }
}

/** Returns a useful browser filename from a generated Blob-typed upload value. */
export function getUploadFilename(file: Blob, fallback: string): string {
  const name = (file as Blob & { name?: unknown }).name
  return typeof name === 'string' && name.trim() ? name : fallback
}

function getCompatibleBlobConstructor(formData: FormData): typeof Blob {
  if (
    typeof window !== 'undefined' &&
    typeof window.FormData !== 'undefined' &&
    formData instanceof window.FormData
  ) {
    return window.Blob
  }

  return Blob
}
