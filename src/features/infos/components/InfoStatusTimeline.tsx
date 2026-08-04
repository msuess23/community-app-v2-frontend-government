import { Clock3 } from 'lucide-react'

import { InfoStatusBadge } from '@/features/infos/components/InfoBadges'
import type { InfoStatusRecord } from '@/features/infos/model/info-model'
import { formatDisplayDateTime } from '@/shared/format/display-values'

/** Displays the simple public status log without presenting it as audit history or event sourcing. */
export function InfoStatusTimeline({
  entries,
}: Readonly<{ entries: readonly InfoStatusRecord[] }>) {
  if (entries.length === 0) {
    return (
      <p className="text-on-surface-variant leading-7">
        Für diese Mitteilung wurden noch keine Statusmeldungen veröffentlicht.
      </p>
    )
  }

  return (
    <ol className="relative space-y-0">
      {entries.map((entry, index) => (
        <li
          className="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-3 sm:grid-cols-[2.5rem_minmax(0,1fr)] sm:gap-4"
          key={entry.id}
        >
          <div aria-hidden="true" className="relative flex justify-center">
            {index < entries.length - 1 ? (
              <span className="bg-outline-variant absolute top-5 bottom-0 w-px" />
            ) : null}
            <span className="border-primary bg-surface-container-lowest relative mt-1.5 h-3.5 w-3.5 rounded-full border-2" />
          </div>
          <article className="min-w-0 pb-7">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <InfoStatusBadge status={entry.status} />
                <p className="text-on-surface-variant leading-7">
                  {entry.message ?? 'Keine öffentliche Nachricht hinterlegt.'}
                </p>
              </div>
              <time
                className="text-on-surface-variant inline-flex shrink-0 items-center gap-1.5 text-sm"
                dateTime={entry.createdAt}
              >
                <Clock3 aria-hidden="true" size={16} />
                {formatDisplayDateTime(entry.createdAt)}
              </time>
            </div>
          </article>
        </li>
      ))}
    </ol>
  )
}
