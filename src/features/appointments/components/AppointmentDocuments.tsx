import { useQuery } from '@tanstack/react-query'
import { Eye, EyeOff, FileText } from 'lucide-react'

import { AppointmentDocumentDownloadButton } from '@/features/appointments/components/AppointmentDocumentDownloadButton'
import { AppointmentDocumentUploadDialog } from '@/features/appointments/components/AppointmentDocumentUploadDialog'
import { AppointmentDocumentVersionHistory } from '@/features/appointments/components/AppointmentDocumentVersionHistory'
import { APPOINTMENT_DOCUMENT_ERROR_MESSAGES } from '@/features/appointments/model/appointment-document-form'
import {
  getAppointmentDocumentTypeLabel,
  type AppointmentDocumentRecord,
} from '@/features/appointments/model/appointment-document'
import { createAppointmentDocumentsQueryOptions } from '@/features/appointments/queries/appointment-document-queries'
import {
  formatDisplayDateTime,
  formatDisplayFileSize,
} from '@/shared/format/display-values'
import { RemoteDataBoundary } from '@/shared/remote-data/RemoteDataBoundary'

/** Presents current document groups and immutable version histories for one appointment. */
export function AppointmentDocuments({
  appointmentId,
}: Readonly<{ appointmentId: string }>) {
  const query = useQuery({
    ...createAppointmentDocumentsQueryOptions(appointmentId),
    enabled: appointmentId.length > 0,
  })
  const currentDocuments = query.data

  return (
    <div className="space-y-5">
      {currentDocuments ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-on-surface-variant text-sm" aria-live="polite">
            {currentDocuments.length}{' '}
            {currentDocuments.length === 1
              ? 'aktuelle Dokumentgruppe'
              : 'aktuelle Dokumentgruppen'}
          </p>
          <AppointmentDocumentUploadDialog
            appointmentId={appointmentId}
            currentDocuments={currentDocuments}
          />
        </div>
      ) : null}

      <RemoteDataBoundary
        empty={<AppointmentDocumentEmptyState />}
        errorOptions={{
          fallback: {
            description:
              'Die Termindokumente konnten nicht geladen werden. Versuche es erneut.',
            title: 'Dokumente nicht verfügbar',
          },
          messagesByErrorCode: APPOINTMENT_DOCUMENT_ERROR_MESSAGES,
        }}
        isEmpty={(documents) => documents.length === 0}
        loadingLabel="Termindokumente werden geladen."
        query={query}
      >
        {(documents) => (
          <ul className="grid gap-4" aria-label="Aktuelle Termindokumente">
            {documents.map((document) => (
              <li key={document.documentGroupId}>
                <AppointmentDocumentGroup
                  appointmentId={appointmentId}
                  document={document}
                />
              </li>
            ))}
          </ul>
        )}
      </RemoteDataBoundary>
    </div>
  )
}

function AppointmentDocumentEmptyState() {
  return (
    <div className="bg-surface-container-low rounded-xl p-5 text-center sm:p-6">
      <FileText aria-hidden="true" className="mx-auto" size={32} />
      <h3 className="mt-3 text-lg font-semibold">Noch keine Dokumente</h3>
      <p className="text-on-surface-variant mx-auto mt-2 max-w-xl leading-7">
        Lege eine erste unveränderliche PDF-Dokumentgruppe für diesen Termin an.
      </p>
    </div>
  )
}

function AppointmentDocumentGroup({
  appointmentId,
  document,
}: Readonly<{
  appointmentId: string
  document: AppointmentDocumentRecord
}>) {
  const headingId = `appointment-document-${document.documentGroupId}-heading`

  return (
    <article
      aria-labelledby={headingId}
      className="border-outline-variant rounded-xl border p-4 sm:p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <span className="bg-primary-container text-on-primary-container flex size-10 shrink-0 items-center justify-center rounded-full">
              <FileText aria-hidden="true" size={20} />
            </span>
            <div className="min-w-0">
              <p className="text-on-surface-variant text-sm font-medium">
                {getAppointmentDocumentTypeLabel(document.documentType)}
              </p>
              <h3 className="mt-1 break-words font-semibold" id={headingId}>
                {document.originalFilename}
              </h3>
            </div>
          </div>

          <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-on-surface-variant">Aktuelle Version</dt>
              <dd className="mt-1">Version {document.versionNumber}</dd>
            </div>
            <div>
              <dt className="text-on-surface-variant">Dateigröße</dt>
              <dd className="mt-1">
                {formatDisplayFileSize(document.sizeBytes)}
              </dd>
            </div>
            <div>
              <dt className="text-on-surface-variant">Hochgeladen</dt>
              <dd className="mt-1">
                <time dateTime={document.uploadedAt}>
                  {formatDisplayDateTime(document.uploadedAt)}
                </time>
              </dd>
            </div>
            <div>
              <dt className="text-on-surface-variant">Bürgerfreigabe</dt>
              <dd className="mt-1 inline-flex items-center gap-2">
                {document.visibleToCitizen ? (
                  <Eye aria-hidden="true" size={16} />
                ) : (
                  <EyeOff aria-hidden="true" size={16} />
                )}
                {document.visibleToCitizen
                  ? 'Für Bürger sichtbar'
                  : 'Nur intern'}
              </dd>
            </div>
          </dl>
        </div>

        <AppointmentDocumentDownloadButton
          appointmentId={appointmentId}
          document={document}
        />
      </div>

      <div className="mt-4">
        <AppointmentDocumentVersionHistory
          appointmentId={appointmentId}
          currentDocument={document}
        />
      </div>
    </article>
  )
}
