import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'

import type { AppointmentDocumentResponse } from '@/api/generated/models'
import { AppointmentDocuments } from '@/features/appointments/components/AppointmentDocuments'
import { renderRouter } from '@/test/render'
import { mockApiServer } from '@/test/server'

const APPOINTMENT_ID = '00000000-0000-4000-8000-000000000100'
const GROUP_ID = '00000000-0000-4000-8000-000000000200'

describe('AppointmentDocuments', () => {
  it('shows current metadata, retained versions and uploads a fixed-type replacement', async () => {
    const uploadBodies: Array<Record<string, FormDataEntryValue | null>> = []
    let currentDocument = documentResponse({
      document_type: 'FORM',
      original_filename: 'antrag-v2.pdf',
      version_number: 2,
    })

    mockApiServer.use(
      http.get(
        `http://localhost/api/v1/appointments/${APPOINTMENT_ID}/documents`,
        () => HttpResponse.json([currentDocument]),
      ),
      http.get(
        `http://localhost/api/v1/appointments/${APPOINTMENT_ID}/documents/${GROUP_ID}/versions`,
        () =>
          HttpResponse.json([
            currentDocument,
            documentResponse({
              id: 'document-v1',
              is_current: false,
              original_filename: 'antrag-v1.pdf',
              uploaded_at: '2026-08-01T08:00:00Z',
              version_number: 1,
            }),
          ]),
      ),
      http.post(
        `http://localhost/api/v1/appointments/${APPOINTMENT_ID}/documents`,
        async ({ request }) => {
          const formData = await request.formData()
          uploadBodies.push({
            documentType: formData.get('document_type'),
            file: formData.get('file'),
            groupId: formData.get('replace_document_group_id'),
            visible: formData.get('visible_to_citizen'),
          })
          currentDocument = documentResponse({
            document_type: 'FORM',
            id: 'document-v3',
            original_filename: 'antrag-v3.pdf',
            replaced_version_id: 'document-v2',
            uploaded_at: '2026-08-06T12:00:00Z',
            version_number: 3,
            visible_to_citizen: true,
          })
          return HttpResponse.json(currentDocument, { status: 201 })
        },
      ),
    )

    const user = userEvent.setup()
    renderRouter([
      {
        path: '/',
        Component: () => <AppointmentDocuments appointmentId={APPOINTMENT_ID} />,
      },
    ])

    expect(await screen.findByText('antrag-v2.pdf')).toBeVisible()
    expect(screen.getByText('Version 2')).toBeVisible()
    expect(screen.getByText('Nur intern')).toBeVisible()

    await user.click(screen.getByRole('button', {
        name: 'Versionshistorie von antrag-v2.pdf',
      }))
    const history = await screen.findByRole('region', {
      name: 'Versionshistorie von antrag-v2.pdf',
    })
    expect(within(history).getByText('antrag-v1.pdf')).toBeVisible()
    expect(within(history).getByText('Aktuell')).toBeVisible()
    expect(
      within(history).queryByRole('button', { name: /löschen/i }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'PDF hochladen' }))
    const dialog = screen.getByRole('dialog', {
      name: 'Termindokument hochladen',
    })
    await user.click(
      within(dialog).getByRole('radio', {
        name: /Bestehendes Dokument ersetzen/,
      }),
    )
    await user.selectOptions(
      within(dialog).getByRole('combobox', { name: 'Dokumentgruppe' }),
      GROUP_ID,
    )
    expect(
      within(dialog).getByRole('combobox', { name: 'Dokumenttyp' }),
    ).toBeDisabled()
    await user.upload(
      within(dialog).getByLabelText(/^PDF-Datei/),
      new File(['%PDF-1.4\n%%EOF'], 'antrag-v3.pdf', {
        type: 'application/pdf',
      }),
    )
    await user.click(
      within(dialog).getByRole('checkbox', {
        name: /Aktuelle Version für den Bürger freigeben/,
      }),
    )
    await user.click(
      within(dialog).getByRole('button', { name: 'Neue Version hochladen' }),
    )

    expect(
      await screen.findByText('Neue Dokumentversion hochgeladen'),
    ).toBeVisible()
    expect(uploadBodies).toHaveLength(1)
    expect(uploadBodies[0]).toEqual(
      expect.objectContaining({
        documentType: 'FORM',
        groupId: GROUP_ID,
        visible: 'true',
      }),
    )
    expect(uploadBodies[0]?.file).toBeInstanceOf(File)
    expect(
      (await screen.findAllByText('antrag-v3.pdf')).length,
    ).toBeGreaterThan(0)
    expect(screen.getAllByText('Für Bürger sichtbar').length).toBeGreaterThan(0)
  })

  it('uploads the first internal document group without a replacement id', async () => {
    const uploadBodies: Array<Record<string, FormDataEntryValue | null>> = []
    let currentDocuments: ReturnType<typeof documentResponse>[] = []

    mockApiServer.use(
      http.get(
        `http://localhost/api/v1/appointments/${APPOINTMENT_ID}/documents`,
        () => HttpResponse.json(currentDocuments),
      ),
      http.post(
        `http://localhost/api/v1/appointments/${APPOINTMENT_ID}/documents`,
        async ({ request }) => {
          const formData = await request.formData()
          uploadBodies.push({
            documentType: formData.get('document_type'),
            file: formData.get('file'),
            groupId: formData.get('replace_document_group_id'),
            visible: formData.get('visible_to_citizen'),
          })
          const created = documentResponse({
            document_type: 'PROTOCOL',
            id: 'document-v1',
            original_filename: 'protokoll.pdf',
            replaced_version_id: null,
            version_number: 1,
          })
          currentDocuments = [created]
          return HttpResponse.json(created, { status: 201 })
        },
      ),
    )

    const user = userEvent.setup()
    renderRouter([
      {
        path: '/',
        Component: () => <AppointmentDocuments appointmentId={APPOINTMENT_ID} />,
      },
    ])

    await user.click(
      await screen.findByRole('button', { name: 'PDF hochladen' }),
    )
    const dialog = screen.getByRole('dialog', {
      name: 'Termindokument hochladen',
    })
    await user.selectOptions(
      within(dialog).getByRole('combobox', { name: 'Dokumenttyp' }),
      'PROTOCOL',
    )
    await user.upload(
      within(dialog).getByLabelText(/^PDF-Datei/),
      new File(['%PDF-1.4\n%%EOF'], 'protokoll.pdf', {
        type: 'application/pdf',
      }),
    )
    await user.click(
      within(dialog).getByRole('button', { name: 'Dokument hochladen' }),
    )

    expect(await screen.findByText('Dokument hochgeladen')).toBeVisible()
    expect(uploadBodies).toHaveLength(1)
    expect(uploadBodies[0]).toEqual(
      expect.objectContaining({
        documentType: 'PROTOCOL',
        groupId: null,
        visible: 'false',
      }),
    )
    expect(await screen.findByText('protokoll.pdf')).toBeVisible()
    expect(screen.getByText('Nur intern')).toBeVisible()
  })

  it('guards a selected local PDF when the upload dialog is dismissed', async () => {
    mockApiServer.use(
      http.get(
        `http://localhost/api/v1/appointments/${APPOINTMENT_ID}/documents`,
        () => HttpResponse.json([]),
      ),
    )

    const user = userEvent.setup()
    renderRouter([
      {
        path: '/',
        Component: () => <AppointmentDocuments appointmentId={APPOINTMENT_ID} />,
      },
    ])

    await user.click(
      await screen.findByRole('button', { name: 'PDF hochladen' }),
    )
    const uploadDialog = screen.getByRole('dialog', {
      name: 'Termindokument hochladen',
    })
    await user.upload(
      within(uploadDialog).getByLabelText(/^PDF-Datei/),
      new File(['%PDF-1.4\n%%EOF'], 'notice.pdf', {
        type: 'application/pdf',
      }),
    )
    await user.click(
      within(uploadDialog).getByRole('button', {
        name: 'Dokumentdialog schließen',
      }),
    )

    const confirmation = screen.getByRole('dialog', {
      name: 'Dokumentupload verwerfen?',
    })
    expect(confirmation).toBeVisible()
    await user.click(
      within(confirmation).getByRole('button', { name: 'Weiter bearbeiten' }),
    )
    expect(uploadDialog).toBeVisible()

    await user.click(
      within(uploadDialog).getByRole('button', {
        name: 'Dokumentdialog schließen',
      }),
    )
    await user.click(
      within(
        screen.getByRole('dialog', { name: 'Dokumentupload verwerfen?' }),
      ).getByRole('button', { name: 'Änderungen verwerfen' }),
    )
    expect(uploadDialog).not.toBeVisible()
    expect(screen.getByRole('button', { name: 'PDF hochladen' })).toHaveFocus()
  })
})

function documentResponse(
  overrides: Partial<AppointmentDocumentResponse> = {},
): AppointmentDocumentResponse {
  return {
    appointment_id: APPOINTMENT_ID,
    document_group_id: GROUP_ID,
    document_type: 'NOTICE',
    id: 'document-v2',
    is_current: true,
    mime_type: 'application/pdf',
    original_filename: 'notice-v2.pdf',
    replaced_version_id: 'document-v1',
    size_bytes: 2048,
    uploaded_at: '2026-08-05T10:00:00Z',
    url: `/api/v1/appointments/${APPOINTMENT_ID}/documents/document-v2/content`,
    version_number: 2,
    visible_to_citizen: false,
    ...overrides,
  }
}
