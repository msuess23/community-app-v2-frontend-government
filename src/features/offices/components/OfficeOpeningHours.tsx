import {
  OFFICE_WEEKDAYS,
  type OfficeOpeningHours,
} from '@/features/offices/model/office-model'

/** Displays every weekday with an explicit closed or unavailable state. */
export function OfficeOpeningHoursView({
  openingHours,
}: Readonly<{ openingHours: OfficeOpeningHours | null }>) {
  return (
    <dl className="divide-outline-variant divide-y">
      {OFFICE_WEEKDAYS.map(({ key, label }) => (
        <div
          className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4"
          key={key}
        >
          <dt className="font-semibold">{label}</dt>
          <dd className="text-on-surface-variant">
            <OpeningHoursValue value={openingHours?.[key] ?? null} />
          </dd>
        </div>
      ))}
    </dl>
  )
}

/** Converts one normalized backend value into readable interval text. */
function OpeningHoursValue({ value }: Readonly<{ value: string | null }>) {
  if (!value) {
    return <>Nicht angegeben</>
  }

  if (value.trim().toLocaleLowerCase('de-DE') === 'geschlossen') {
    return <>Geschlossen</>
  }

  const intervals = value
    .split(',')
    .map((interval) => interval.trim())
    .filter(Boolean)

  return (
    <ul className="grid gap-1">
      {intervals.map((interval, index) => (
        <li key={`${interval}-${index}`}>{formatOpeningInterval(interval)}</li>
      ))}
    </ul>
  )
}

/** Improves the spoken and visual representation of a valid HH:MM-HH:MM interval. */
function formatOpeningInterval(interval: string): string {
  const match = /^(\d{2}:\d{2})-(\d{2}:\d{2})$/.exec(interval)

  return match ? `${match[1]}–${match[2]} Uhr` : interval
}
