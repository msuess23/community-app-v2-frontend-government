import type { ApiErrorMessage } from '@/api/client/api-error-presentation'

/** Localized failures shared by the ticket directory and current detail view. */
export const TICKET_READ_ERROR_MESSAGES: Readonly<
  Record<string, ApiErrorMessage>
> = {
  TICKET_NOT_FOUND: {
    description:
      'Das Ticket wurde entfernt oder liegt außerhalb deines aktuellen Zuständigkeitsbereichs.',
    title: 'Ticket nicht verfügbar',
  },
}

/** Localized validation failures returned by the internal ticket directory. */
export const TICKET_DIRECTORY_ERROR_MESSAGES: Readonly<
  Record<string, ApiErrorMessage>
> = {
  DATE_TIMEZONE_REQUIRED: {
    description:
      'Die Datumsgrenzen konnten nicht mit einer gültigen Zeitzone verarbeitet werden. Setze die Datumsfilter zurück und versuche es erneut.',
    title: 'Datumsfilter nicht gültig',
  },
  INVALID_DATE_RANGE: {
    description:
      'Das jeweilige Von-Datum darf nicht nach dem Bis-Datum liegen. Passe die Datumsfilter an.',
    title: 'Zeitraum der Filter nicht gültig',
  },
}
