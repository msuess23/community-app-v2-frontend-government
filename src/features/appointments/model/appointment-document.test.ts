import type { AppointmentDocumentResponse } from '@/api/generated/models'
import { describe, expect, it } from 'vitest'

import {
  getAppointmentDocumentLabel,
  getAppointmentDocumentTypeLabel,
  mapAppointmentDocumentVersions,
  mapCurrentAppointmentDocuments,
} from '@/features/appointments/model/appointment-document'

describe('appointment document model', () => {
  it('maps current document metadata and keeps deterministic upload order', () => {
    const documents = mapCurrentAppointmentDocuments([
      documentResponse({
        id: 'document-2',
        original_filename: 'formular.pdf',
        uploaded_at: '2026-08-06T10:00:00Z',
      }),
      documentResponse({
        id: 'document-1',
        original_filename: 'bestaetigung.pdf',
        uploaded_at: '2026-08-05T10:00:00Z',
      }),
    ])

    expect(documents.map((document) => document.id)).toEqual([
      'document-1',
      'document-2',
    ])
    expect(documents[0]).toEqual(
      expect.objectContaining({
        documentGroupId: 'group-1',
        originalFilename: 'bestaetigung.pdf',
        visibleToCitizen: false,
      }),
    )
  })

  it('orders retained versions newest first even when the API order changes', () => {
    const versions = mapAppointmentDocumentVersions([
      documentResponse({ id: 'v1', version_number: 1 }),
      documentResponse({ id: 'v3', version_number: 3 }),
      documentResponse({ id: 'v2', version_number: 2 }),
    ])

    expect(versions.map((version) => version.versionNumber)).toEqual([3, 2, 1])
  })

  it('provides stable localized type and action labels', () => {
    const document = mapCurrentAppointmentDocuments([
      documentResponse({ document_type: 'PROTOCOL' }),
    ])[0]

    expect(getAppointmentDocumentTypeLabel('PROTOCOL')).toBe('Protokoll')
    expect(getAppointmentDocumentLabel(document!)).toBe(
      'Protokoll – dokument.pdf',
    )
  })
})

function documentResponse(
  overrides: Partial<AppointmentDocumentResponse> = {},
): AppointmentDocumentResponse {
  return {
    appointment_id: 'appointment-1',
    document_group_id: 'group-1',
    document_type: 'NOTICE',
    id: 'document-1',
    is_current: true,
    mime_type: 'application/pdf',
    original_filename: 'dokument.pdf',
    replaced_version_id: null,
    size_bytes: 1024,
    uploaded_at: '2026-08-05T10:00:00Z',
    url: '/api/v1/appointments/appointment-1/documents/document-1/content',
    version_number: 1,
    visible_to_citizen: false,
    ...overrides,
  }
}
