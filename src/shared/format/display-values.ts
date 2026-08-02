const DISPLAY_LOCALE = 'de-DE'
export const DEFAULT_DISPLAY_TIME_ZONE = 'Europe/Berlin'
const EMPTY_VALUE = '–'

type DateInput = Date | number | string | null | undefined

type DateFormatOptions = Readonly<{
  timeZone?: string
}>

/** Formats a calendar date consistently for German authority users. */
export function formatDisplayDate(
  value: DateInput,
  options: DateFormatOptions = {},
): string {
  return formatDateValue(
    value,
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    },
    options.timeZone,
  )
}

/** Formats a timestamp in the configured authority display time zone. */
export function formatDisplayDateTime(
  value: DateInput,
  options: DateFormatOptions = {},
): string {
  return formatDateValue(
    value,
    {
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      month: '2-digit',
      year: 'numeric',
    },
    options.timeZone,
  )
}

/** Formats a time while preserving timezone-aware backend semantics. */
export function formatDisplayTime(
  value: DateInput,
  options: DateFormatOptions = {},
): string {
  return formatDateValue(
    value,
    {
      hour: '2-digit',
      minute: '2-digit',
    },
    options.timeZone,
  )
}

/** Formats integer result counts and other non-fractional display values. */
export function formatDisplayInteger(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return EMPTY_VALUE
  }

  return new Intl.NumberFormat(DISPLAY_LOCALE, {
    maximumFractionDigits: 0,
  }).format(value)
}

/** Applies the shared locale and timezone to a validated date value. */
function formatDateValue(
  value: DateInput,
  formatOptions: Intl.DateTimeFormatOptions,
  timeZone = DEFAULT_DISPLAY_TIME_ZONE,
): string {
  const date = toValidDate(value)

  if (date === null) {
    return EMPTY_VALUE
  }

  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    ...formatOptions,
    timeZone,
  }).format(date)
}

/** Converts supported input into a valid Date without throwing. */
function toValidDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Formats a byte count for compact, locale-aware file metadata. */
export function formatDisplayFileSize(bytes: number | null | undefined): string {
  if (
    bytes === null ||
    bytes === undefined ||
    !Number.isFinite(bytes) ||
    bytes < 0
  ) {
    return EMPTY_VALUE
  }

  if (bytes === 0) {
    return '0 Byte'
  }

  const units = ['Byte', 'KB', 'MB', 'GB'] as const
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  )
  const value = bytes / 1024 ** unitIndex

  return `${new Intl.NumberFormat(DISPLAY_LOCALE, {
    maximumFractionDigits: unitIndex === 0 ? 0 : 1,
  }).format(value)} ${units[unitIndex]}`
}
