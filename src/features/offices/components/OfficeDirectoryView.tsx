import { ExternalLink } from 'lucide-react'
import { Link, useLocation } from 'react-router'

import type { OfficeDirectorySortField } from '@/features/offices/model/office-directory'
import {
  getOfficeDisplayLabel,
  getOfficeLocationLabel,
  getOfficeTelephoneHref,
  type OfficeRecord,
} from '@/features/offices/model/office-model'
import { OfficeStatusBadge } from '@/features/offices/components/OfficeStatusBadge'
import {
  ResponsiveDataView,
  type DataViewColumn,
} from '@/shared/data-view/ResponsiveDataView'
import type { DataViewSort } from '@/shared/data-view/data-view-url-state'
import { formatDisplayDate } from '@/shared/format/display-values'
import { createResourceDetailNavigationState } from '@/shared/resource-detail/detail-navigation'
import { LinkButton } from '@/shared/ui/LinkButton'

export interface OfficeDirectoryViewProps {
  items: readonly OfficeRecord[]
  onSortChange: (sort: DataViewSort<OfficeDirectorySortField>) => void
  sort: DataViewSort<OfficeDirectorySortField> | null
}

/** Presents offices as a desktop table and device-appropriate compact cards. */
export function OfficeDirectoryView({
  items,
  onSortChange,
  sort,
}: OfficeDirectoryViewProps) {
  const location = useLocation()
  const navigationState = createResourceDetailNavigationState(location)
  const columns = createOfficeColumns({
    navigationState,
    onSortChange,
    sort,
  })

  return (
    <ResponsiveDataView
      caption="Behördenverzeichnis"
      columns={columns}
      compactListClassName="sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0"
      getItemLabel={getOfficeDisplayLabel}
      getRowKey={(office) => office.id}
      items={items}
      tableBreakpoint="lg"
    />
  )
}

type CreateOfficeColumnsInput = Readonly<{
  navigationState: ReturnType<typeof createResourceDetailNavigationState>
  onSortChange: (sort: DataViewSort<OfficeDirectorySortField>) => void
  sort: DataViewSort<OfficeDirectorySortField> | null
}>

/** Defines one shared information hierarchy for office rows and compact cards. */
function createOfficeColumns({
  navigationState,
  onSortChange,
  sort,
}: CreateOfficeColumnsInput): readonly DataViewColumn<OfficeRecord>[] {
  return [
    {
      header: 'Name',
      id: 'name',
      isRowHeader: true,
      render: (office) => (
        <Link
          className="text-primary focus-visible:outline-primary rounded-sm underline decoration-2 underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
          state={navigationState}
          to={`/offices/${office.id}`}
        >
          {office.name}
        </Link>
      ),
      sort: createColumnSort('name', 'Name', sort, onSortChange),
    },
    {
      header: 'Ort',
      id: 'location',
      render: getOfficeLocationLabel,
    },
    {
      header: 'Kontakt',
      id: 'contact',
      render: (office) => <OfficeDirectoryContact office={office} />,
      sort: createColumnSort(
        'contactEmail',
        'Kontakt-E-Mail-Adresse',
        sort,
        onSortChange,
      ),
    },
    {
      header: 'Leistungen',
      id: 'services',
      render: (office) => formatServiceSummary(office.services),
    },
    {
      header: 'Status',
      id: 'status',
      render: (office) => <OfficeStatusBadge isActive={office.isActive} />,
    },
    {
      header: 'Erstellt am',
      id: 'createdAt',
      mobileLabel: 'Erstellt',
      render: (office) => formatDisplayDate(office.createdAt),
      sort: createColumnSort(
        'createdAt',
        'Erstellungsdatum',
        sort,
        onSortChange,
      ),
    },
    {
      align: 'end',
      header: 'Aktionen',
      id: 'actions',
      isAction: true,
      render: (office) => (
        <LinkButton
          aria-label={`${getOfficeDisplayLabel(office)} öffnen`}
          size="sm"
          state={navigationState}
          to={`/offices/${office.id}`}
          variant="outline"
        >
          Details
          <ExternalLink aria-hidden="true" size={16} />
        </LinkButton>
      ),
    },
  ]
}

/** Shows the available contact channels without exposing blank placeholders. */
function OfficeDirectoryContact({ office }: Readonly<{ office: OfficeRecord }>) {
  if (!office.contactEmail && !office.phone) {
    return <>Keine Kontaktdaten</>
  }

  return (
    <span className="grid gap-1">
      {office.contactEmail ? (
        <a
          className="text-primary focus-visible:outline-primary rounded-sm break-all underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
          href={`mailto:${office.contactEmail}`}
        >
          {office.contactEmail}
        </a>
      ) : null}
      {office.phone ? (
        <a
          className="text-primary focus-visible:outline-primary rounded-sm underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
          href={`tel:${getOfficeTelephoneHref(office.phone)}`}
        >
          {office.phone}
        </a>
      ) : null}
    </span>
  )
}

/** Keeps service lists compact while preserving the number of hidden entries. */
function formatServiceSummary(services: readonly string[]): string {
  if (services.length === 0) {
    return 'Keine Leistungen hinterlegt'
  }

  const visibleServices = services.slice(0, 2)
  const remainingCount = services.length - visibleServices.length

  return remainingCount > 0
    ? `${visibleServices.join(', ')} und ${remainingCount} weitere`
    : visibleServices.join(', ')
}

/** Connects one sortable column to the feature-owned URL sort state. */
function createColumnSort(
  field: OfficeDirectorySortField,
  sortLabel: string,
  sort: DataViewSort<OfficeDirectorySortField> | null,
  onSortChange: (sort: DataViewSort<OfficeDirectorySortField>) => void,
) {
  return {
    direction: sort?.field === field ? sort.direction : null,
    onChange: (direction: 'asc' | 'desc') =>
      onSortChange({ direction, field }),
    sortLabel,
  }
}
