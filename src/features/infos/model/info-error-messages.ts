import type { ApiErrorMessage } from '@/api/client/api-error-presentation'

/** Shared read-model messages for current Info projections and their status row. */
export const INFO_READ_ERROR_MESSAGES: Readonly<
  Record<string, ApiErrorMessage>
> = {
  INFO_NOT_FOUND: {
    description:
      'Die Mitteilung wurde gelöscht oder ist nicht mehr verfügbar.',
    title: 'Mitteilung nicht verfügbar',
  },
  INFO_STATUS_NOT_FOUND: {
    description:
      'Für diese Mitteilung fehlt der aktuelle Status. Der Datenbestand muss administrativ geprüft werden.',
    title: 'Status der Mitteilung nicht verfügbar',
  },
}

/** Localized validation failures returned by the non-geographic Info directory. */
export const INFO_DIRECTORY_ERROR_MESSAGES: Readonly<
  Record<string, ApiErrorMessage>
> = {
  DATE_TIMEZONE_REQUIRED: {
    description:
      'Die ausgewählten Datumsgrenzen konnten nicht mit einer gültigen Zeitzone verarbeitet werden. Setze die Datumsfilter zurück und versuche es erneut.',
    title: 'Datumsfilter nicht gültig',
  },
  INVALID_DATE_RANGE: {
    description:
      '„Beginnt ab“ darf nicht nach „Endet bis“ liegen. Passe die Datumsfilter an.',
    title: 'Zeitraum der Filter nicht gültig',
  },
}
