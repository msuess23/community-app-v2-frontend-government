import {
  ChevronDown,
  ChevronUp,
  Mail,
  MapPin,
  Phone,
} from 'lucide-react'
import { Fragment, useId, useState, type ReactNode } from 'react'

import { OfficeOpeningHoursView } from '@/features/offices/components/OfficeOpeningHours'
import { OfficeStatusBadge } from '@/features/offices/components/OfficeStatusBadge'
import type {
  OfficeHistoryAddress,
  OfficeHistoryRecord,
} from '@/features/offices/model/office-history'
import { getOfficeTelephoneHref } from '@/features/offices/model/office-model'
import { UserReferenceName } from '@/features/users/components/UserReferenceName'
import { formatDisplayDateTime } from '@/shared/format/display-values'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'

export interface OfficeHistoryViewProps {
  items: readonly OfficeHistoryRecord[]
}

/** Presents immutable office snapshots as compact desktop rows and responsive cards. */
export function OfficeHistoryView({ items }: OfficeHistoryViewProps) {
  return (
    <>
      <div className="border-outline-variant bg-surface hidden overflow-x-auto rounded-xl border shadow-sm lg:block">
        <table className="min-w-full border-collapse">
          <caption className="sr-only">Änderungshistorie der Behörde</caption>
          <thead className="bg-surface-container">
            <tr>
              {[
                'Geändert am',
                'Änderungsgrund',
                'Status',
                'Geändert durch',
                'Snapshotdetails',
              ].map((header) => (
                <th
                  className="text-on-surface px-4 py-3 text-left text-xs font-semibold tracking-wide uppercase"
                  key={header}
                  scope="col"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-outline-variant divide-y">
            {items.map((item) => (
              <OfficeHistoryTableRows item={item} key={item.id} />
            ))}
          </tbody>
        </table>
      </div>

      <ul
        aria-label="Änderungshistorie der Behörde"
        className="grid gap-4 sm:grid-cols-2 lg:hidden"
      >
        {items.map((item) => (
          <li key={item.id}>
            <OfficeHistoryCard item={item} />
          </li>
        ))}
      </ul>
    </>
  )
}

/** Renders one desktop summary row and its controlled full-width detail row. */
function OfficeHistoryTableRows({
  item,
}: Readonly<{ item: OfficeHistoryRecord }>) {
  const [isExpanded, setIsExpanded] = useState(false)
  const generatedId = useId()
  const detailsId = `${generatedId}-office-history-details`

  return (
    <Fragment>
      <tr className="hover:bg-surface-container-low">
        <th className="px-4 py-4 text-left text-sm font-semibold" scope="row">
          {formatDisplayDateTime(item.changedAt)}
        </th>
        <td className="max-w-md px-4 py-4 text-sm align-top">
          <span className="whitespace-pre-wrap">{item.changeReason}</span>
        </td>
        <td className="px-4 py-4 text-sm align-top">
          <OfficeStatusBadge isActive={item.isActive} />
        </td>
        <td className="px-4 py-4 text-sm align-top">
          <UserReferenceName userId={item.changedByUserId} />
        </td>
        <td className="px-4 py-3 text-sm align-top">
          <Button
            aria-controls={detailsId}
            aria-expanded={isExpanded}
            onPress={() => setIsExpanded((current) => !current)}
            size="sm"
            type="button"
            variant="outline"
          >
            {isExpanded ? (
              <ChevronUp aria-hidden="true" size={17} />
            ) : (
              <ChevronDown aria-hidden="true" size={17} />
            )}
            {isExpanded ? 'Details schließen' : 'Details anzeigen'}
          </Button>
        </td>
      </tr>
      <tr hidden={!isExpanded}>
        <td className="bg-surface-container-low px-4 py-5" colSpan={5}>
          <div id={detailsId}>
            <OfficeHistorySnapshotDetails headingLevel={2} item={item} />
          </div>
        </td>
      </tr>
    </Fragment>
  )
}

/** Renders one compact snapshot card with native disclosure semantics. */
function OfficeHistoryCard({ item }: Readonly<{ item: OfficeHistoryRecord }>) {
  return (
    <Card className="h-full" padding="sm">
      <article
        aria-label={`Änderungsstand vom ${formatDisplayDateTime(item.changedAt)}`}
        className="space-y-4"
      >
        <header className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h2 className="font-semibold">
              {formatDisplayDateTime(item.changedAt)}
            </h2>
            <OfficeStatusBadge isActive={item.isActive} />
          </div>
          <p className="text-on-surface-variant whitespace-pre-wrap text-sm leading-6">
            {item.changeReason}
          </p>
          <p className="text-sm">
            <span className="text-on-surface-variant font-medium">
              Geändert durch:{' '}
            </span>
            <UserReferenceName userId={item.changedByUserId} />
          </p>
        </header>

        <details className="border-outline-variant border-t pt-4">
          <summary className="text-primary focus-visible:outline-primary min-h-11 cursor-pointer rounded-lg px-2 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2">
            Vollständigen Behördenstand anzeigen
          </summary>
          <div className="mt-4">
            <OfficeHistorySnapshotDetails headingLevel={3} item={item} />
          </div>
        </details>
      </article>
    </Card>
  )
}

/** Groups the complete result-state snapshot into readable semantic sections. */
function OfficeHistorySnapshotDetails({
  headingLevel,
  item,
}: Readonly<{ headingLevel: 2 | 3; item: OfficeHistoryRecord }>) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <SnapshotSection headingLevel={headingLevel} title="Grunddaten">
        <SnapshotMetadata
          items={[
            { label: 'Name', value: item.name },
            {
              label: 'Beschreibung',
              value: item.description ?? 'Keine Beschreibung hinterlegt.',
            },
            {
              label: 'Status',
              value: item.isActive ? 'Aktiv' : 'Deaktiviert',
            },
          ]}
        />
      </SnapshotSection>

      <SnapshotSection headingLevel={headingLevel} title="Kontakt">
        <OfficeHistoryContact item={item} />
      </SnapshotSection>

      <SnapshotSection headingLevel={headingLevel} title="Leistungen">
        <OfficeHistoryServices services={item.services} />
      </SnapshotSection>

      <SnapshotSection headingLevel={headingLevel} title="Historische Adresse">
        <OfficeHistoryAddressView address={item.address} />
      </SnapshotSection>

      <SnapshotSection
        className="xl:col-span-2"
        headingLevel={headingLevel}
        title="Öffnungszeiten"
      >
        <OfficeOpeningHoursView openingHours={item.openingHours} />
      </SnapshotSection>

      <SnapshotSection
        className="xl:col-span-2"
        headingLevel={headingLevel}
        title="Snapshot-Metadaten"
      >
        <SnapshotMetadata
          items={[
            {
              label: 'Geändert am',
              value: formatDisplayDateTime(item.changedAt),
            },
            { label: 'Änderungsgrund', value: item.changeReason },
            {
              label: 'Geändert durch',
              value: <UserReferenceName userId={item.changedByUserId} />,
            },
          ]}
        />
      </SnapshotSection>
    </div>
  )
}

/** Provides a named visual group with a context-appropriate heading level. */
function SnapshotSection({
  children,
  className,
  headingLevel,
  title,
}: Readonly<{
  children: ReactNode
  className?: string
  headingLevel: 2 | 3
  title: string
}>) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3'

  return (
    <section
      aria-label={title}
      className={cn(
        'border-outline-variant rounded-xl border p-4',
        className,
      )}
    >
      <Heading className="text-base font-semibold">{title}</Heading>
      <div className="mt-3">{children}</div>
    </section>
  )
}

/** Displays compact historical values as a description list. */
function SnapshotMetadata({
  items,
}: Readonly<{
  items: ReadonlyArray<Readonly<{ label: string; value: ReactNode }>>
}>) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <div className="min-w-0 space-y-1" key={item.label}>
          <dt className="text-on-surface-variant text-sm font-medium">
            {item.label}
          </dt>
          <dd className="whitespace-pre-wrap break-words">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Renders historical contact values without consulting the current office. */
function OfficeHistoryContact({
  item,
}: Readonly<{ item: OfficeHistoryRecord }>) {
  if (!item.contactEmail && !item.phone) {
    return <p className="text-on-surface-variant">Keine Kontaktdaten hinterlegt.</p>
  }

  return (
    <ul className="grid gap-3">
      {item.contactEmail ? (
        <li>
          <a
            className="text-primary focus-visible:outline-primary inline-flex min-h-11 items-center gap-2 rounded-sm break-all underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
            href={`mailto:${item.contactEmail}`}
          >
            <Mail aria-hidden="true" className="shrink-0" size={18} />
            {item.contactEmail}
          </a>
        </li>
      ) : null}
      {item.phone ? (
        <li>
          <a
            className="text-primary focus-visible:outline-primary inline-flex min-h-11 items-center gap-2 rounded-sm underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
            href={`tel:${getOfficeTelephoneHref(item.phone)}`}
          >
            <Phone aria-hidden="true" className="shrink-0" size={18} />
            {item.phone}
          </a>
        </li>
      ) : null}
    </ul>
  )
}

/** Displays the postal address captured by the historical snapshot. */
function OfficeHistoryAddressView({
  address,
}: Readonly<{ address: OfficeHistoryAddress | null }>) {
  if (!address) {
    return <p className="text-on-surface-variant">Keine Adresse hinterlegt.</p>
  }

  const postalAddress = formatHistoricalPostalAddress(address)

  return (
    <address className="flex gap-2 not-italic">
      <MapPin aria-hidden="true" className="mt-1 shrink-0" size={18} />
      <span className="whitespace-pre-line">{postalAddress}</span>
    </address>
  )
}

/** Renders the historical service collection as a semantic list. */
function OfficeHistoryServices({
  services,
}: Readonly<{ services: readonly string[] }>) {
  if (services.length === 0) {
    return <p className="text-on-surface-variant">Keine Leistungen hinterlegt.</p>
  }

  return (
    <ul className="grid list-disc gap-2 pl-5 sm:grid-cols-2">
      {services.map((service, index) => (
        <li key={`${service}-${index}`}>{service}</li>
      ))}
    </ul>
  )
}

/** Prefers the explicit historical fields and uses formatted as a safe fallback. */
function formatHistoricalPostalAddress(address: OfficeHistoryAddress): string {
  const streetLine = [address.street, address.houseNumber]
    .filter(Boolean)
    .join(' ')
  const cityLine = [address.zipCode, address.city].filter(Boolean).join(' ')
  const lines = [streetLine, cityLine].filter(Boolean)

  if (lines.length > 0) {
    return lines.join('\n')
  }

  return address.formatted ?? 'Adressdaten im Snapshot unvollständig.'
}
