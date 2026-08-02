import { isApiError } from '@/api/client/api-error'

export type ApiErrorMessage = Readonly<{
  description: string
  title: string
}>

export type ApiErrorPresentationOptions = Readonly<{
  fallback?: ApiErrorMessage
  messagesByErrorCode?: Readonly<Record<string, ApiErrorMessage>>
}>

const defaultFallback: ApiErrorMessage = {
  description:
    'Die Aktion konnte nicht abgeschlossen werden. Versuche es erneut.',
  title: 'Aktion fehlgeschlagen',
}

const messagesByStatus: Readonly<Record<number, ApiErrorMessage>> = {
  0: {
    description:
      'Der Server ist derzeit nicht erreichbar. Prüfe die Verbindung und versuche es erneut.',
    title: 'Keine Verbindung zum Server',
  },
  400: {
    description:
      'Die Anfrage konnte nicht verarbeitet werden. Überprüfe die Angaben und versuche es erneut.',
    title: 'Anfrage nicht möglich',
  },
  401: {
    description:
      'Die Sitzung ist nicht mehr gültig. Melde dich erneut an und wiederhole die Aktion.',
    title: 'Sitzung abgelaufen',
  },
  403: {
    description: 'Für diese Aktion fehlen die erforderlichen Berechtigungen.',
    title: 'Zugriff nicht erlaubt',
  },
  404: {
    description:
      'Der angeforderte Eintrag wurde nicht gefunden oder ist nicht mehr verfügbar.',
    title: 'Eintrag nicht gefunden',
  },
  409: {
    description:
      'Der Stand hat sich zwischenzeitlich geändert. Lade die Daten neu und prüfe die verfügbaren Aktionen.',
    title: 'Daten wurden zwischenzeitlich geändert',
  },
  422: {
    description:
      'Einige Angaben sind ungültig. Überprüfe die markierten Felder und versuche es erneut.',
    title: 'Angaben überprüfen',
  },
  429: {
    description:
      'Es wurden zu viele Anfragen gesendet. Warte kurz und versuche es erneut.',
    title: 'Zu viele Anfragen',
  },
  500: {
    description:
      'Auf dem Server ist ein unerwarteter Fehler aufgetreten. Versuche es später erneut.',
    title: 'Serverfehler',
  },
}

const messagesByErrorCode: Readonly<Record<string, ApiErrorMessage>> = {
  FORBIDDEN: messagesByStatus[403],
  INTERNAL_SERVER_ERROR: messagesByStatus[500],
  NETWORK_ERROR: messagesByStatus[0],
  RESOURCE_CONFLICT: messagesByStatus[409],
  RESOURCE_NOT_FOUND: messagesByStatus[404],
  UNAUTHORIZED: messagesByStatus[401],
  VALIDATION_ERROR: messagesByStatus[422],
  WORKFLOW_VALIDATION_FAILED: messagesByStatus[409],
}

/** Converts transport failures into safe, localized feedback for end users. */
export function getApiErrorPresentation(
  error: unknown,
  options: ApiErrorPresentationOptions = {},
): ApiErrorMessage {
  if (!isApiError(error)) {
    return options.fallback ?? defaultFallback
  }

  if (error.errorCode) {
    const mappedMessage =
      options.messagesByErrorCode?.[error.errorCode] ??
      messagesByErrorCode[error.errorCode]

    if (mappedMessage) {
      return mappedMessage
    }
  }

  if (error.status >= 500) {
    return messagesByStatus[500]
  }

  return messagesByStatus[error.status] ?? options.fallback ?? defaultFallback
}
