import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronUp, History } from 'lucide-react'
import { useId, useState } from 'react'

import { AppointmentDocumentDownloadButton } from '@/features/appointments/components/AppointmentDocumentDownloadButton'
import { APPOINTMENT_DOCUMENT_ERROR_MESSAGES } from '@/features/appointments/model/appointment-document-form'
import type { AppointmentDocumentRecord } from '@/features/appointments/model/appointment-document'
import { createAppointmentDocumentVersionsQueryOptions } from '@/features/appointments/queries/appointment-document-queries'
import { formatDisplayDateTime, formatDisplayFileSize } from '@/shared/format/display-values'
import { RemoteDataBoundary } from '@/shared/remote-data/RemoteDataBoundary'
import { Button } from '@/shared/ui/Button'

/** Loads and presents every retained immutable version of one document group. */
export function AppointmentDocumentVersionHistory({
  appointmentId,
  currentDocument,
}: Readonly<{
  appointmentId: string
  currentDocument: AppointmentDocumentRecord
}>) {
  const [isExpanded, setExpanded] = useState(false)
  const regionId = useId()
  const query = useQuery({
    ...createAppointmentDocumentVersionsQueryOptions(
      appointmentId,
      currentDocument.documentGroupId,
    ),
    enabled: isExpanded,
  })

  return (
    <div className="border-outline-variant border-t pt-4">
      <Button
        aria-controls={regionId}
        aria-label={`Versionshistorie von ${currentDocument.originalFilename}`}
        aria-expanded={isExpanded}
        onPress={() => setExpanded((current) => !current)}
        size="sm"
        variant="ghost"
      >
        <History aria-hidden="true" size={16} />
        Versionshistorie
        {isExpanded ? (
          <ChevronUp aria-hidden="true" size={16} />
        ) : (
          <ChevronDown aria-hidden="true" size={16} />
        )}
      </Button>

      {isExpanded ? (
        <div
          aria-label={`Versionshistorie von ${currentDocument.originalFilename}`}
          className="mt-4"
          id={regionId}
          role="region"
        >
          <RemoteDataBoundary
            errorOptions={{
              fallback: {
                description:
                  'Die Dokumentversionen konnten nicht geladen werden. Versuche es erneut.',
                title: 'Versionshistorie nicht verfügbar',
              },
              messagesByErrorCode: APPOINTMENT_DOCUMENT_ERROR_MESSAGES,
            }}
            loadingLabel="Dokumentversionen werden geladen."
            query={query}
          >
            {(versions) => (
              <ol
                aria-label="Dokumentversionen, neueste zuerst"
                className="space-y-3"
              >
                {versions.map((version) => (
                  <li
                    className="bg-surface-container-low border-outline-variant rounded-xl border p-4"
                    key={version.id}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">
                            Version {version.versionNumber}
                          </p>
                          {version.isCurrent ? (
                            <span className="bg-primary-container text-on-primary-container rounded-full px-2.5 py-1 text-xs font-semibold">
                              Aktuell
                            </span>
                          ) : null}
                        </div>
                        <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                          <div>
                            <dt className="text-on-surface-variant">Datei</dt>
                            <dd className="break-words">
                              {version.originalFilename}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-on-surface-variant">Größe</dt>
                            <dd>{formatDisplayFileSize(version.sizeBytes)}</dd>
                          </div>
                          <div>
                            <dt className="text-on-surface-variant">Hochgeladen</dt>
                            <dd>
                              <time dateTime={version.uploadedAt}>
                                {formatDisplayDateTime(version.uploadedAt)}
                              </time>
                            </dd>
                          </div>
                          <div>
                            <dt className="text-on-surface-variant">Bürgerfreigabe</dt>
                            <dd>
                              {version.visibleToCitizen
                                ? 'Für Bürger sichtbar'
                                : 'Nur intern'}
                            </dd>
                          </div>
                        </dl>
                      </div>
                      <AppointmentDocumentDownloadButton
                        appointmentId={appointmentId}
                        document={version}
                      />
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </RemoteDataBoundary>
        </div>
      ) : null}
    </div>
  )
}
