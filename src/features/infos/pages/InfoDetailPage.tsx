import { useQuery } from '@tanstack/react-query'
import { Building2, Clock3, MapPin, Pencil } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router'

import { useAuth } from '@/auth/auth-context'
import { InfoCategoryBadge, InfoStatusBadge } from '@/features/infos/components/InfoBadges'
import { InfoImageManager } from '@/features/infos/components/InfoImageManager'
import { InfoStatusTimeline } from '@/features/infos/components/InfoStatusTimeline'
import type { InfoAddress, InfoRecord } from '@/features/infos/model/info-model'
import { canManageInfo } from '@/features/infos/model/info-permissions'
import {
  createInfoDetailQueryOptions,
  createInfoImagesQueryOptions,
  createInfoStatusHistoryQueryOptions,
} from '@/features/infos/queries/info-queries'
import { formatDisplayDateTime } from '@/shared/format/display-values'
import { MediaGallery } from '@/shared/media/MediaGallery'
import { OfficeName } from '@/shared/offices/OfficeName'
import { RemoteDataBoundary } from '@/shared/remote-data/RemoteDataBoundary'
import {
  ResourceDetailLayout,
  ResourceDetailSection,
  ResourceMetadataList,
} from '@/shared/resource-detail/ResourceDetailLayout'
import { resolveResourceDetailReturnTo } from '@/shared/resource-detail/detail-navigation'
import { LinkButton } from '@/shared/ui/LinkButton'

const DETAIL_NAVIGATION = [
  { id: 'description', label: 'Beschreibung' },
  { id: 'images', label: 'Bilder' },
  { id: 'status-history', label: 'Statusverlauf' },
  { id: 'period', label: 'Zeitraum' },
  { id: 'office', label: 'Behörde' },
  { id: 'address', label: 'Adresse' },
] as const

/** Shows one current Info with its separate image collection and public status log. */
export function InfoDetailPage() {
  const { user } = useAuth()
  const { infoId = '' } = useParams()
  const location = useLocation()
  const infoQuery = useQuery({
    ...createInfoDetailQueryOptions(infoId),
    enabled: infoId.length > 0,
  })
  const returnTo = resolveResourceDetailReturnTo(location.state, '/infos')

  return (
    <RemoteDataBoundary
      errorOptions={{
        messagesByErrorCode: {
          INFO_NOT_FOUND: {
            description:
              'Die Mitteilung wurde gelöscht oder ist nicht mehr verfügbar.',
            title: 'Mitteilung nicht verfügbar',
          },
        },
        fallback: {
          description:
            'Die Mitteilung konnte nicht geladen werden. Versuche es erneut.',
          title: 'Mitteilung nicht verfügbar',
        },
      }}
      loadingLabel="Mitteilung wird geladen."
      query={infoQuery}
    >
      {(info) => (
        <ResourceDetailLayout
          actions={
            user && canManageInfo(user, info) ? (
              <LinkButton
                state={{
                  from: `/infos/${info.id}`,
                  listFrom: returnTo,
                }}
                to={`/infos/${info.id}/edit`}
              >
                <Pencil aria-hidden="true" size={18} />
                Mitteilung bearbeiten
              </LinkButton>
            ) : undefined
          }
          aside={<InfoDetailAside info={info} />}
          backLink={{ label: 'Zurück zum Mitteilungsverzeichnis', to: returnTo }}
          description="Aktuell veröffentlichter Stand der behördlichen Mitteilung."
          eyebrow={<InfoCategoryBadge category={info.category} />}
          navigationClassName="lg:hidden"
          navigationItems={DETAIL_NAVIGATION}
          status={<InfoStatusBadge status={info.currentStatus.status} />}
          title={info.title}
        >
          <ResourceDetailSection id="description" title="Beschreibung">
            <p className="text-on-surface-variant whitespace-pre-wrap leading-7">
              {info.description ?? 'Keine Beschreibung hinterlegt.'}
            </p>
          </ResourceDetailSection>

          <InfoImagesSection
            canManage={Boolean(user && canManageInfo(user, info))}
            infoId={info.id}
          />
          <InfoStatusHistorySection infoId={info.id} />
        </ResourceDetailLayout>
      )}
    </RemoteDataBoundary>
  )
}

function InfoImagesSection({
  canManage,
  infoId,
}: Readonly<{ canManage: boolean; infoId: string }>) {
  const imagesQuery = useQuery(createInfoImagesQueryOptions(infoId))

  return (
    <ResourceDetailSection
      description="Die Bildbeschreibungen stammen aus der behördlichen Veröffentlichung."
      id="images"
      title="Bilder"
    >
      <RemoteDataBoundary
        errorOptions={{
          fallback: {
            description:
              'Die Bilder konnten nicht geladen werden. Die übrigen Inhalte bleiben verfügbar.',
            title: 'Bilder nicht verfügbar',
          },
        }}
        loadingLabel="Bilder der Mitteilung werden geladen."
        query={imagesQuery}
      >
        {(images) =>
          canManage ? (
            <InfoImageManager assets={images} infoId={infoId} />
          ) : (
            <MediaGallery assets={images} />
          )
        }
      </RemoteDataBoundary>
    </ResourceDetailSection>
  )
}

function InfoStatusHistorySection({ infoId }: Readonly<{ infoId: string }>) {
  const statusQuery = useQuery(createInfoStatusHistoryQueryOptions(infoId))

  return (
    <ResourceDetailSection
      description="Öffentliche Statusmeldungen in der vom Backend gelieferten Reihenfolge. Dieser Verlauf ist keine Änderungshistorie der Inhalte."
      id="status-history"
      title="Statusverlauf"
    >
      <RemoteDataBoundary
        errorOptions={{
          fallback: {
            description:
              'Der Statusverlauf konnte nicht geladen werden. Der aktuelle Status steht weiterhin im Seitenkopf.',
            title: 'Statusverlauf nicht verfügbar',
          },
        }}
        loadingLabel="Statusverlauf wird geladen."
        query={statusQuery}
      >
        {(entries) => <InfoStatusTimeline entries={entries} />}
      </RemoteDataBoundary>
    </ResourceDetailSection>
  )
}

function InfoDetailAside({ info }: Readonly<{ info: InfoRecord }>) {
  return (
    <>
      <ResourceDetailSection id="period" title="Zeitraum" variant="outlined">
        <div className="flex gap-2">
          <Clock3 aria-hidden="true" className="mt-1 shrink-0" size={18} />
          <dl className="grid gap-4">
            <div>
              <dt className="text-on-surface-variant text-sm font-medium">Beginn</dt>
              <dd>
                <time dateTime={info.startsAt}>
                  {formatDisplayDateTime(info.startsAt)}
                </time>
              </dd>
            </div>
            <div>
              <dt className="text-on-surface-variant text-sm font-medium">Ende</dt>
              <dd>
                <time dateTime={info.endsAt}>
                  {formatDisplayDateTime(info.endsAt)}
                </time>
              </dd>
            </div>
          </dl>
        </div>
      </ResourceDetailSection>

      <ResourceDetailSection id="office" title="Behörde" variant="outlined">
        <div className="flex gap-2">
          <Building2 aria-hidden="true" className="mt-1 shrink-0" size={18} />
          {info.officeId ? (
            <Link
              className="text-primary focus-visible:outline-primary rounded-sm underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
              to={`/offices/${info.officeId}`}
            >
              <OfficeName officeId={info.officeId} />
            </Link>
          ) : (
            <span>Behördenübergreifende Mitteilung</span>
          )}
        </div>
      </ResourceDetailSection>

      <ResourceDetailSection id="address" title="Adresse" variant="outlined">
        <InfoAddressView address={info.address} />
      </ResourceDetailSection>

      <ResourceDetailSection id="metadata" title="Veröffentlichung" variant="subtle">
        <ResourceMetadataList
          className="sm:grid-cols-1 xl:grid-cols-1"
          items={[
            {
              label: 'Erstellt am',
              value: formatDisplayDateTime(info.createdAt),
            },
            {
              label: 'Zuletzt geändert',
              value: formatDisplayDateTime(info.updatedAt),
            },
          ]}
        />
      </ResourceDetailSection>
    </>
  )
}

function InfoAddressView({
  address,
}: Readonly<{ address: InfoAddress | null }>) {
  if (!address) {
    return <p className="text-on-surface-variant">Keine Adresse hinterlegt.</p>
  }

  return (
    <address className="flex gap-2 not-italic">
      <MapPin aria-hidden="true" className="mt-1 shrink-0" size={18} />
      <span className="grid gap-1">
        <span>
          {address.street} {address.houseNumber}
        </span>
        <span>
          {address.zipCode} {address.city}
        </span>
      </span>
    </address>
  )
}
