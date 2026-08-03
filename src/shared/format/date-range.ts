import { DEFAULT_DISPLAY_TIME_ZONE } from '@/shared/format/display-values'

export type DayBoundary = 'end' | 'start'

/** Returns whether a value is a real calendar date in strict YYYY-MM-DD form. */
export function isIsoCalendarDate(value: string): boolean {
  return parseIsoCalendarDate(value) !== null
}

/** Converts an ISO calendar date into a timezone-aware inclusive day boundary. */
export function toZonedDayBoundaryIso(
  value: string,
  boundary: DayBoundary,
  timeZone = DEFAULT_DISPLAY_TIME_ZONE,
): string {
  const parts = parseIsoCalendarDate(value)

  if (!parts) {
    throw new Error(`Invalid ISO calendar date: ${value}`)
  }

  const hour = boundary === 'start' ? 0 : 23
  const minute = boundary === 'start' ? 0 : 59
  const second = boundary === 'start' ? 0 : 59
  const millisecond = boundary === 'start' ? 0 : 999
  const targetUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    hour,
    minute,
    second,
    millisecond,
  )
  let instant = targetUtc

  // Iterating resolves the correct offset on both sides of a daylight-saving transition.
  for (let iteration = 0; iteration < 3; iteration += 1) {
    const offset = getTimeZoneOffsetMilliseconds(new Date(instant), timeZone)
    const candidate = targetUtc - offset

    if (candidate === instant) {
      break
    }

    instant = candidate
  }

  return new Date(instant).toISOString()
}

/** Reads a strict YYYY-MM-DD value without accepting browser-dependent date formats. */
function parseIsoCalendarDate(
  value: string,
): Readonly<{ day: number; month: number; year: number }> | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)

  if (!match) {
    return null
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  return { day, month, year }
}

/** Calculates the represented timezone offset for one concrete instant. */
function getTimeZoneOffsetMilliseconds(date: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    month: '2-digit',
    second: '2-digit',
    timeZone,
    year: 'numeric',
  })
  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  )
  const representedUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  )

  return representedUtc - Math.trunc(date.getTime() / 1000) * 1000
}
