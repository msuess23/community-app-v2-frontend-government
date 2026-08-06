import type { ApiErrorMessage } from '@/api/client/api-error-presentation'

export const APPOINTMENT_READ_ERROR_MESSAGES: Readonly<
  Record<string, ApiErrorMessage>
> = {
  APPOINTMENT_NOT_FOUND: {
    description:
      'Der Termin wurde entfernt oder liegt außerhalb des Zuständigkeitsbereichs deiner Behörde.',
    title: 'Termin nicht verfügbar',
  },
}

export const APPOINTMENT_DIRECTORY_ERROR_MESSAGES: Readonly<
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
