import {
  getApiErrorPresentation,
  type ApiErrorMessage,
} from '@/api/client/api-error-presentation'

export const TICKET_IMAGE_ERROR_MESSAGES: Readonly<
  Record<string, ApiErrorMessage>
> = {
  EMPTY_TICKET_IMAGE: {
    description: 'Die ausgewählte Datei enthält keine Bilddaten.',
    title: 'Leere Bilddatei',
  },
  INVALID_TICKET_IMAGE_CONTENT: {
    description:
      'Die Datei konnte nicht als gültiges JPEG-, PNG- oder WebP-Bild gelesen werden.',
    title: 'Ungültiger Bildinhalt',
  },
  INVALID_TICKET_IMAGE_DIMENSIONS: {
    description:
      'Die Abmessungen des Bildes konnten nicht zuverlässig bestimmt werden.',
    title: 'Ungültige Bildabmessungen',
  },
  TICKET_ALREADY_IN_PROCESS: {
    description:
      'Die Bilder können nicht mehr geändert werden, weil die Bearbeitung bereits begonnen hat.',
    title: 'Bildverwaltung nicht mehr möglich',
  },
  TICKET_COMPLETED: {
    description:
      'Bei einem abgeschlossenen Ticket können keine Bilder mehr geändert werden.',
    title: 'Ticket bereits abgeschlossen',
  },
  TICKET_IMAGE_FILE_NOT_FOUND: {
    description:
      'Die Bilddatei ist im Speicher nicht mehr verfügbar. Lade die Seite neu und prüfe den aktuellen Stand.',
    title: 'Bilddatei nicht verfügbar',
  },
  TICKET_IMAGE_NOT_FOUND: {
    description:
      'Das Bild wurde zwischenzeitlich entfernt oder gehört nicht mehr zu diesem Ticket.',
    title: 'Bild nicht verfügbar',
  },
  TICKET_IMAGE_TOO_LARGE: {
    description: 'Ein Ticketbild darf höchstens 5 MiB groß sein.',
    title: 'Bilddatei zu groß',
  },
  TICKET_IMAGE_TYPE_MISMATCH: {
    description:
      'Dateiendung, gemeldeter Dateityp und tatsächlicher Bildinhalt passen nicht zusammen.',
    title: 'Widersprüchlicher Bildtyp',
  },
  TICKET_NOT_FOUND: {
    description:
      'Das Ticket ist nicht mehr verfügbar oder du hast keinen Zugriff mehr darauf.',
    title: 'Ticket nicht verfügbar',
  },
  UNSUPPORTED_TICKET_IMAGE_TYPE: {
    description: 'Unterstützt werden ausschließlich JPEG-, PNG- und WebP-Bilder.',
    title: 'Dateityp nicht unterstützt',
  },
}

/** Maps ticket-image failures to stable localized management feedback. */
export function getTicketImageErrorPresentation(
  error: unknown,
): ApiErrorMessage {
  return getApiErrorPresentation(error, {
    fallback: {
      description:
        'Die Bildaktion konnte nicht abgeschlossen werden. Versuche es erneut.',
      title: 'Bildaktion fehlgeschlagen',
    },
    messagesByErrorCode: TICKET_IMAGE_ERROR_MESSAGES,
  })
}

/** Produces compact per-file feedback for the shared sequential upload queue. */
export function getTicketImageUploadErrorMessage(error: unknown): string {
  const presentation = getTicketImageErrorPresentation(error)
  return `${presentation.title}: ${presentation.description}`
}
