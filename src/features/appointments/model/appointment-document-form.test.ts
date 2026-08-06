import { describe, expect, it } from 'vitest'

import { ApiError } from '@/api/client/api-error'
import {
  appointmentDocumentUploadSchema,
  createAppointmentDocumentUploadDefaults,
  getAppointmentDocumentErrorPresentation,
  getReplacementDocumentType,
  toAppointmentDocumentUploadRequest,
} from '@/features/appointments/model/appointment-document-form'
import type { AppointmentDocumentRecord } from '@/features/appointments/model/appointment-document'

const INVALID_DOCUMENT_FILES: ReadonlyArray<readonly [File, string]> = [
  [new File([], 'empty.pdf', { type: 'application/pdf' }), 'leer'],
  [new File(['text'], 'notice.txt', { type: 'text/plain' }), 'PDF-Datei'],
  [pdfFile('large.pdf', 10 * 1024 * 1024 + 1), '10 MiB'],
]

describe('appointment document upload form', () => {
  it('accepts a valid PDF from the configured multipart upload realm', () => {
    const file = new File(['%PDF-1.4\n%%EOF'], 'notice.pdf', {
      type: 'application/pdf',
    })

    expect(
      appointmentDocumentUploadSchema.safeParse({
        ...createAppointmentDocumentUploadDefaults(),
        files: [file],
      }).success,
    ).toBe(true)
  })

  it('accepts a valid PDF created by the browser realm', () => {
    const file = new window.File(['%PDF-1.4\n%%EOF'], 'notice.pdf', {
      type: 'application/pdf',
    })

    expect(
      appointmentDocumentUploadSchema.safeParse({
        ...createAppointmentDocumentUploadDefaults(),
        files: [file],
      }).success,
    ).toBe(true)
  })

  it('accepts one bounded PDF and maps a new document group request', () => {
    const file = pdfFile('notice.pdf', 1024)
    const values = appointmentDocumentUploadSchema.parse({
      ...createAppointmentDocumentUploadDefaults(),
      documentType: 'NOTICE',
      files: [file],
      visibleToCitizen: true,
    })

    expect(toAppointmentDocumentUploadRequest(values)).toEqual({
      document_type: 'NOTICE',
      file,
      replace_document_group_id: null,
      visible_to_citizen: true,
    })
  })

  it('requires a group in replacement mode and preserves its fixed type', () => {
    const current = documentRecord({ documentType: 'FORM' })

    expect(
      appointmentDocumentUploadSchema.safeParse({
        ...createAppointmentDocumentUploadDefaults(),
        files: [pdfFile('form.pdf', 128)],
        mode: 'REPLACE',
      }).success,
    ).toBe(false)
    expect(getReplacementDocumentType('group-1', [current])).toBe('FORM')

    const values = appointmentDocumentUploadSchema.parse({
      documentGroupId: 'group-1',
      documentType: 'FORM',
      files: [pdfFile('form-v2.pdf', 128)],
      mode: 'REPLACE',
      visibleToCitizen: false,
    })
    expect(toAppointmentDocumentUploadRequest(values)).toEqual(
      expect.objectContaining({
        document_type: 'FORM',
        replace_document_group_id: 'group-1',
      }),
    )
  })

  it('localizes a projection conflict without exposing backend details', () => {
    const presentation = getAppointmentDocumentErrorPresentation(
      new ApiError({
        errorCode: 'APPOINTMENT_PROJECTION_VERSION_MISMATCH',
        message: 'technical backend detail',
        status: 409,
      }),
    )

    expect(presentation).toEqual({
      description:
        'Der gespeicherte Terminstand ist vorübergehend inkonsistent. Das Dokument wurde nicht hochgeladen.',
      title: 'Terminstand muss geprüft werden',
    })
  })

  it.each(INVALID_DOCUMENT_FILES)(
    'rejects invalid local file %s',
    (file, expectedMessage) => {
      const result = appointmentDocumentUploadSchema.safeParse({
        ...createAppointmentDocumentUploadDefaults(),
        files: [file],
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(
          result.error.issues.some((issue) =>
            issue.message.includes(expectedMessage),
          ),
        ).toBe(true)
      }
    },
  )
})

function pdfFile(name: string, size: number): File {
  return new File([new Uint8Array(size)], name, { type: 'application/pdf' })
}

function documentRecord(
  overrides: Partial<AppointmentDocumentRecord> = {},
): AppointmentDocumentRecord {
  return {
    appointmentId: 'appointment-1',
    documentGroupId: 'group-1',
    documentType: 'NOTICE',
    id: 'document-1',
    isCurrent: true,
    mimeType: 'application/pdf',
    originalFilename: 'notice.pdf',
    replacedVersionId: null,
    sizeBytes: 1024,
    uploadedAt: '2026-08-05T10:00:00Z',
    url: '/documents/document-1/content',
    versionNumber: 1,
    visibleToCitizen: false,
    ...overrides,
  }
}
