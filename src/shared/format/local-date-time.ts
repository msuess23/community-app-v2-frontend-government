import { DEFAULT_DISPLAY_TIME_ZONE } from '@/shared/format/display-values'

export type LocalDateTimeParts = Readonly<{
  day: number
  hour: number
  minute: number
  month: number
  year: number
}>

/** Converts a backend instant into the local value expected by datetime-local controls. */
export function toLocalDateTimeInputValue(
  value: string,
  timeZone = DEFAULT_DISPLAY_TIME_ZONE,
): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const parts = getRepresentedParts(date, timeZone)
  return `${pad(parts.year, 4)}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`
}

/** Converts a strict local wall-clock value into one timezone-aware backend instant. */
export function toZonedDateTimeIso(
  value: string,
  timeZone = DEFAULT_DISPLAY_TIME_ZONE,
): string {
  const parts = parseLocalDateTime(value)
  if (!parts) {
    throw new Error(`Invalid local date-time: ${value}`)
  }

  const targetUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
  )
  let instant = targetUtc

  for (let iteration = 0; iteration < 4; iteration += 1) {
    const offset = getTimeZoneOffsetMilliseconds(new Date(instant), timeZone)
    const candidate = targetUtc - offset
    if (candidate === instant) {
      break
    }
    instant = candidate
  }

  const represented = getRepresentedParts(new Date(instant), timeZone)
  if (!sameParts(parts, represented)) {
    throw new Error(`Local date-time does not exist in ${timeZone}: ${value}`)
  }

  return new Date(instant).toISOString()
}

/** Returns whether a datetime-local value represents a real wall-clock time. */
export function isValidLocalDateTime(
  value: string,
  timeZone = DEFAULT_DISPLAY_TIME_ZONE,
): boolean {
  try {
    toZonedDateTimeIso(value, timeZone)
    return true
  } catch {
    return false
  }
}

function parseLocalDateTime(value: string): LocalDateTimeParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if (!match) {
    return null
  }

  const parts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
  }
  const date = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute),
  )

  if (
    date.getUTCFullYear() !== parts.year ||
    date.getUTCMonth() !== parts.month - 1 ||
    date.getUTCDate() !== parts.day ||
    date.getUTCHours() !== parts.hour ||
    date.getUTCMinutes() !== parts.minute
  ) {
    return null
  }

  return parts
}

function getRepresentedParts(
  date: Date,
  timeZone: string,
): LocalDateTimeParts {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    month: '2-digit',
    timeZone,
    year: 'numeric',
  })
  const values = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  )

  return {
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    month: values.month,
    year: values.year,
  }
}

function getTimeZoneOffsetMilliseconds(date: Date, timeZone: string): number {
  const represented = getRepresentedParts(date, timeZone)
  const representedUtc = Date.UTC(
    represented.year,
    represented.month - 1,
    represented.day,
    represented.hour,
    represented.minute,
  )
  return representedUtc - Math.trunc(date.getTime() / 60_000) * 60_000
}

function sameParts(left: LocalDateTimeParts, right: LocalDateTimeParts): boolean {
  return (
    left.year === right.year &&
    left.month === right.month &&
    left.day === right.day &&
    left.hour === right.hour &&
    left.minute === right.minute
  )
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0')
}
