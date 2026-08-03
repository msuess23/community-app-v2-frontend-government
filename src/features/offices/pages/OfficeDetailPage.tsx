import { useQuery } from '@tanstack/react-query'
import { Mail, MapPin, Phone } from 'lucide-react'
import { useLocation, useParams } from 'react-router'

import { OfficeOpeningHoursView } from '@/features/offices/components/OfficeOpeningHours'
import { OfficeStatusBadge } from '@/features/offices/components/OfficeStatusBadge'
import {
  getOfficeTelephoneHref,
  type OfficeAddress,
  type OfficeRecord,
} from '@/features/offices/model/office-model'
import { createOfficeDetailQueryOptions } from '@/features/offices/queries/office-queries'
import { formatDisplayDateTime } from '@/shared/format/display-values'
import { RemoteDataBoundary } from '@/shared/remote-data/RemoteDataBoundary'
import {
  ResourceDetailLayout,
  ResourceDetailSection,
  ResourceMetadataList,
} from '@/shared/resource-detail/ResourceDetailLayout'
import { resolveResourceDetailReturnTo } from '@/shared/resource-detail/detail-navigation'

const DETAIL_NAVIGATION = [
  { id: 'description', label: 'Beschreibung' },
  { id: 'services', label: 'Leistungen' },
  { id: 'opening-hours', label: 'Öffnungszeiten' },
  { id: 'contact', label: 'Kontakt' },
  { id: 'address', label: 'Adresse' },
  { id: 'lifecycle', label: 'Status' },
] as const

/** Shows one backend-authorized office with complete readable master data. */
export function OfficeDetailPage() {
  const { officeId = '' } = useParams()
  const location = useLocation()
  const query = useQuery({
    ...createOfficeDetailQueryOptions(officeId),
    enabled: officeId.length > 0,
  })
  const returnTo = resolveResourceDetailReturnTo(location.state, '/offices')

  return (
    <RemoteDataBoundary
      errorOptions={{
        messagesByErrorCode: {
          OFFICE_NOT_FOUND: {
            description:
              'Die Behörde wurde nicht gefunden oder ist für deine Rolle nicht sichtbar.',
            title: 'Behörde nicht verfügbar',
          },
        },
        fallback: {
          description:
            'Die Behördendaten konnten nicht geladen werden. Prüfe den Zugriff und versuche es erneut.',
          title: 'Behörde nicht verfügbar',
        },
      }}
      loadingLabel="Behördendaten werden geladen."
      query={query}
    >
      {(office) => (
        <ResourceDetailLayout
          aside={<OfficeDetailAside office={office} />}
          backLink={{ label: 'Zurück zum Behördenverzeichnis', to: returnTo }}
          description="Die angezeigten Angaben entsprechen dem aktuell gespeicherten Stand der Behörde."
          eyebrow="Behördendetails"
          navigationItems={DETAIL_NAVIGATION}
          status={<OfficeStatusBadge isActive={office.isActive} />}
          title={office.name}
        >
          <ResourceDetailSection id="description" title="Beschreibung">
            <p className="text-on-surface-variant whitespace-pre-wrap leading-7">
              {office.description ?? 'Keine Beschreibung hinterlegt.'}
            </p>
          </ResourceDetailSection>

          <ResourceDetailSection
            description="Angebote und Zuständigkeiten, die für diese Behörde hinterlegt sind."
            id="services"
            title="Leistungen"
          >
            <OfficeServices services={office.services} />
          </ResourceDetailSection>

          <ResourceDetailSection
            description="Wochenübersicht der aktuell veröffentlichten Öffnungszeiten."
            id="opening-hours"
            title="Öffnungszeiten"
          >
            <OfficeOpeningHoursView openingHours={office.openingHours} />
          </ResourceDetailSection>
        </ResourceDetailLayout>
      )}
    </RemoteDataBoundary>
  )
}

/** Groups contact, address and lifecycle metadata in the desktop sidebar. */
function OfficeDetailAside({ office }: Readonly<{ office: OfficeRecord }>) {
  return (
    <>
      <ResourceDetailSection id="contact" title="Kontakt" variant="outlined">
        <OfficeContact office={office} />
      </ResourceDetailSection>

      <ResourceDetailSection id="address" title="Adresse" variant="outlined">
        <OfficeAddressView address={office.address} />
      </ResourceDetailSection>

      <ResourceDetailSection id="lifecycle" title="Status" variant="subtle">
        <ResourceMetadataList
          className="sm:grid-cols-1 xl:grid-cols-1"
          items={[
            {
              label: 'Status',
              value: office.isActive ? 'Aktiv' : 'Deaktiviert',
            },
            {
              label: 'Erstellt am',
              value: formatDisplayDateTime(office.createdAt),
            },
            {
              label: 'Deaktiviert am',
              value: office.deactivatedAt
                ? formatDisplayDateTime(office.deactivatedAt)
                : 'Nicht deaktiviert',
            },
            {
              label: 'Behörden-ID',
              value: <code className="break-all">{office.id}</code>,
            },
          ]}
        />
      </ResourceDetailSection>
    </>
  )
}

/** Renders all available contact channels with actionable links. */
function OfficeContact({ office }: Readonly<{ office: OfficeRecord }>) {
  if (!office.contactEmail && !office.phone) {
    return <p className="text-on-surface-variant">Keine Kontaktdaten hinterlegt.</p>
  }

  return (
    <ul className="grid gap-3">
      {office.contactEmail ? (
        <li>
          <a
            className="text-primary focus-visible:outline-primary inline-flex min-h-11 items-center gap-2 rounded-sm break-all underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
            href={`mailto:${office.contactEmail}`}
          >
            <Mail aria-hidden="true" className="shrink-0" size={18} />
            {office.contactEmail}
          </a>
        </li>
      ) : null}
      {office.phone ? (
        <li>
          <a
            className="text-primary focus-visible:outline-primary inline-flex min-h-11 items-center gap-2 rounded-sm underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
            href={`tel:${getOfficeTelephoneHref(office.phone)}`}
          >
            <Phone aria-hidden="true" className="shrink-0" size={18} />
            {office.phone}
          </a>
        </li>
      ) : null}
    </ul>
  )
}

/** Displays the postal address and optional technical coordinates. */
function OfficeAddressView({
  address,
}: Readonly<{ address: OfficeAddress | null }>) {
  if (!address) {
    return <p className="text-on-surface-variant">Keine Adresse hinterlegt.</p>
  }

  const hasCoordinates =
    address.latitude !== null || address.longitude !== null

  return (
    <div className="space-y-5">
      <address className="flex gap-2 not-italic">
        <MapPin aria-hidden="true" className="mt-1 shrink-0" size={18} />
        <span>
          {address.street} {address.houseNumber}
          <br />
          {address.zipCode} {address.city}
        </span>
      </address>

      {hasCoordinates ? (
        <ResourceMetadataList
          className="sm:grid-cols-1 xl:grid-cols-1"
          items={[
            {
              label: 'Breitengrad',
              value: formatCoordinate(address.latitude),
            },
            {
              label: 'Längengrad',
              value: formatCoordinate(address.longitude),
            },
          ]}
        />
      ) : null}
    </div>
  )
}

/** Renders a semantic list or an explicit empty-state statement. */
function OfficeServices({
  services,
}: Readonly<{ services: readonly string[] }>) {
  if (services.length === 0) {
    return (
      <p className="text-on-surface-variant">Keine Leistungen hinterlegt.</p>
    )
  }

  return (
    <ul className="grid list-disc gap-x-8 gap-y-3 pl-5 sm:grid-cols-2">
      {services.map((service) => (
        <li className="pl-1" key={service}>
          {service}
        </li>
      ))}
    </ul>
  )
}

/** Formats optional geographic metadata without introducing map behavior. */
function formatCoordinate(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return 'Nicht angegeben'
  }

  return new Intl.NumberFormat('de-DE', {
    maximumFractionDigits: 6,
  }).format(value)
}
