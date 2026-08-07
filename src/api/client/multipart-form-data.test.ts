import { File as NodeFile } from 'node:buffer'
import { describe, expect, it } from 'vitest'

import {
  appendFileToFormData,
  getUploadFilename,
} from '@/api/client/multipart-form-data'

describe('multipart FormData files', () => {
  it(
    'preserves the original filename for the native FormData implementation',
    async () => {
      const file = new NodeFile(['document'], 'notice.pdf', {
        type: 'application/pdf',
      })
      const formData = new FormData()
      const blobFile = file as unknown as Blob

      await appendFileToFormData(formData, 'file', blobFile, file.name)

      const appended = formData.get('file')
      expect(appended).not.toBeNull()
      expect(getUploadFilename(appended as Blob, 'fallback.pdf')).toBe(
        'notice.pdf',
      )
      expect((appended as Blob).type).toBe('application/pdf')
    },
  )

  it(
    'copies a foreign Blob into the FormData realm after a brand-check failure',
    async () => {
      const entries: Array<{ filename?: string; value: Blob }> = []
      let firstAttempt = true
      const formData = {
        append(_name: string, value: Blob, filename?: string) {
          if (firstAttempt) {
            firstAttempt = false
            throw new TypeError('Foreign Blob realm')
          }
          entries.push({ filename, value })
        },
      } as unknown as FormData
      const file = new NodeFile(['document'], 'notice.pdf', {
        type: 'application/pdf',
      })

      await appendFileToFormData(
        formData,
        'file',
        file as unknown as Blob,
        file.name,
      )

      expect(entries).toHaveLength(1)
      expect(entries[0]?.filename).toBe('notice.pdf')
      expect(entries[0]?.value.type).toBe('application/pdf')
      expect(entries[0]?.value.size).toBe(file.size)
    },
  )
})
