import { Clock3, MapPin } from 'lucide-react'
import { Link, useLocation } from 'react-router'

import { InfoCategoryBadge, InfoStatusBadge } from '@/features/infos/components/InfoBadges'
import {
  getInfoLocationLabel,
  type InfoRecord,
} from '@/features/infos/model/info-model'
import { formatDisplayDateTime } from '@/shared/format/display-values'
import { MediaImage } from '@/shared/media/MediaImage'
import type { OfficeReference } from '@/shared/offices/office-model'
import { createResourceDetailNavigationState } from '@/shared/resource-detail/detail-navigation'
import { Card } from '@/shared/ui/Card'

export interface InfoDirectoryViewProps {
  items: readonly InfoRecord[]
  offices: readonly OfficeReference[]
}

/** Presents content-oriented Info results as device-adapted cards at every viewport. */
export function InfoDirectoryView({
  items,
  offices,
}: InfoDirectoryViewProps) {
  const location = useLocation()
  const navigationState = createResourceDetailNavigationState(location)
  const officeNames = new Map(offices.map((office) => [office.id, office.name]))

  return (
    <ul
      aria-label="Mitteilungsverzeichnis"
      className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
    >
      {items.map((info) => (
        <li className="min-w-0" key={info.id}>
          <Card
            className="flex h-full flex-col overflow-hidden"
            padding="none"
          >
            {info.imageUrl ? (
              <MediaImage
                altText={null}
                className="aspect-video w-full object-cover"
                decorative
                url={info.imageUrl}
              />
            ) : (
              <div
                aria-hidden="true"
                className="bg-surface-container text-on-surface-variant flex aspect-video items-center justify-center"
              >
                <span className="text-sm font-medium">Kein Titelbild</span>
              </div>
            )}

            <div className="flex flex-1 flex-col gap-4 p-5">
              <div className="flex flex-wrap gap-2">
                <InfoCategoryBadge category={info.category} />
                <InfoStatusBadge status={info.currentStatus.status} />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-semibold tracking-tight">
                  <Link
                    className="text-primary focus-visible:outline-primary rounded-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
                    state={navigationState}
                    to={`/infos/${info.id}`}
                  >
                    {info.title}
                  </Link>
                </h2>
                <p className="text-on-surface-variant line-clamp-3 leading-6">
                  {info.description ?? 'Keine Beschreibung hinterlegt.'}
                </p>
              </div>

              <dl className="text-on-surface-variant mt-auto grid gap-3 text-sm">
                <div className="flex gap-2">
                  <Clock3 aria-hidden="true" className="mt-0.5 shrink-0" size={17} />
                  <div>
                    <dt className="sr-only">Zeitraum</dt>
                    <dd>
                      {formatDisplayDateTime(info.startsAt)} bis{' '}
                      {formatDisplayDateTime(info.endsAt)}
                    </dd>
                  </div>
                </div>
                <div className="flex gap-2">
                  <MapPin aria-hidden="true" className="mt-0.5 shrink-0" size={17} />
                  <div>
                    <dt className="sr-only">Behörde und Ort</dt>
                    <dd>
                      {info.officeId
                        ? (officeNames.get(info.officeId) ?? 'Behörde nicht verfügbar')
                        : 'Behördenübergreifend'}
                      {' · '}
                      {getInfoLocationLabel(info)}
                    </dd>
                  </div>
                </div>
              </dl>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  )
}
