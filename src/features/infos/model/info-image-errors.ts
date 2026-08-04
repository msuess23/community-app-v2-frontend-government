import {
  getApiErrorPresentation,
  type ApiErrorMessage,
} from '@/api/client/api-error-presentation'

const INFO_IMAGE_ERROR_MESSAGES: Readonly<Record<string, ApiErrorMessage>> = {
  EMPTY_INFO_IMAGE: {
    description: 'Die ausgewählte Datei enthält keine Bilddaten.',
    title: 'Leere Bilddatei',
  },
  INFO_IMAGE_FILE_NOT_FOUND: {
    description:
      'Die Bilddatei ist im Speicher nicht mehr verfügbar. Lade die Seite neu oder entferne den veralteten Eintrag.',
    title: 'Bilddatei nicht verfügbar',
  },
  INFO_IMAGE_NOT_FOUND: {
    description:
      'Das Bild wurde zwischenzeitlich entfernt oder gehört nicht mehr zu dieser Mitteilung.',
    title: 'Bild nicht verfügbar',
  },
  INFO_IMAGE_TOO_LARGE: {
    description: 'Ein Info-Bild darf höchstens 5 MiB groß sein.',
    title: 'Bilddatei zu groß',
  },
  INFO_NOT_FOUND: {
    description:
      'Die Mitteilung wurde zwischenzeitlich gelöscht. Bilder können nicht mehr verwaltet werden.',
    title: 'Mitteilung nicht verfügbar',
  },
  INFO_IMAGE_TYPE_MISMATCH: {
    description:
      'Dateiendung, gemeldeter Dateityp und tatsächlicher Bildinhalt passen nicht zusammen.',
    title: 'Widersprüchlicher Bildtyp',
  },
  INVALID_INFO_IMAGE_CONTENT: {
    description:
      'Die Datei konnte nicht als gültiges JPEG-, PNG- oder WebP-Bild gelesen werden.',
    title: 'Ungültiger Bildinhalt',
  },
  INVALID_INFO_IMAGE_DIMENSIONS: {
    description:
      'Die Abmessungen des Bildes konnten nicht zuverlässig bestimmt werden.',
    title: 'Ungültige Bildabmessungen',
  },
  UNSUPPORTED_INFO_IMAGE_TYPE: {
    description: 'Unterstützt werden ausschließlich JPEG-, PNG- und WebP-Bilder.',
    title: 'Dateityp nicht unterstützt',
  },
}

/** Maps backend image failures to stable, localized Info-management feedback. */
export function getInfoImageErrorPresentation(error: unknown): ApiErrorMessage {
  return getApiErrorPresentation(error, {
    fallback: {
      description:
        'Die Bildaktion konnte nicht abgeschlossen werden. Versuche es erneut.',
      title: 'Bildaktion fehlgeschlagen',
    },
    messagesByErrorCode: INFO_IMAGE_ERROR_MESSAGES,
  })
}

/** Produces one compact per-file message for the shared upload queue. */
export function getInfoImageUploadErrorMessage(error: unknown): string {
  const presentation = getInfoImageErrorPresentation(error)
  return `${presentation.title}: ${presentation.description}`
}
