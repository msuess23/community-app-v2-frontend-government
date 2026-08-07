import { ExternalLink } from 'lucide-react'
import { Link, useLocation } from 'react-router'

import {
  TicketCategoryBadge,
  TicketStatusBadge,
  TicketWorkflowStateBadge,
} from '@/features/tickets/components/TicketBadges'
import type { TicketDirectorySortField } from '@/features/tickets/model/ticket-directory'
import {
  getTicketCurrentResponsibilityLabel,
  type TicketRecord,
} from '@/features/tickets/model/ticket-model'
import {
  ResponsiveDataView,
  type DataViewColumn,
} from '@/shared/data-view/ResponsiveDataView'
import type { DataViewSort } from '@/shared/data-view/data-view-url-state'
import { formatDisplayDateTime } from '@/shared/format/display-values'
import { createResourceDetailNavigationState } from '@/shared/resource-detail/detail-navigation'
import { LinkButton } from '@/shared/ui/LinkButton'

export interface TicketDirectoryViewProps {
  items: readonly TicketRecord[]
  onSortChange: (sort: DataViewSort<TicketDirectorySortField>) => void
  sort: DataViewSort<TicketDirectorySortField> | null
}

/** Presents tickets as a desktop table and device-appropriate compact cards. */
export function TicketDirectoryView({
  items,
  onSortChange,
  sort,
}: TicketDirectoryViewProps) {
  const location = useLocation()
  const navigationState = createResourceDetailNavigationState(location)
  const columns = createTicketColumns({
    navigationState,
    onSortChange,
    sort,
  })

  return (
    <ResponsiveDataView
      caption="Ticketverzeichnis"
      columns={columns}
      compactListClassName="sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0"
      getItemLabel={(ticket) => ticket.title}
      getRowKey={(ticket) => ticket.id}
      items={items}
      tableBreakpoint="lg"
    />
  )
}

type CreateTicketColumnsInput = Readonly<{
  navigationState: ReturnType<typeof createResourceDetailNavigationState>
  onSortChange: (sort: DataViewSort<TicketDirectorySortField>) => void
  sort: DataViewSort<TicketDirectorySortField> | null
}>

/** Defines one shared information hierarchy for ticket rows and compact cards. */
function createTicketColumns({
  navigationState,
  onSortChange,
  sort,
}: CreateTicketColumnsInput): readonly DataViewColumn<TicketRecord>[] {
  return [
    {
      header: 'Titel',
      id: 'title',
      isRowHeader: true,
      render: (ticket) => (
        <Link
          className="text-primary focus-visible:outline-primary rounded-sm underline decoration-2 underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
          state={navigationState}
          to={`/tickets/${ticket.id}`}
        >
          {ticket.title}
        </Link>
      ),
      sort: createColumnSort('title', 'Titel', sort, onSortChange),
    },
    {
      header: 'Kategorie',
      id: 'category',
      render: (ticket) => <TicketCategoryBadge category={ticket.category} />,
    },
    {
      header: 'Workflow',
      id: 'workflowState',
      render: (ticket) => (
        <TicketWorkflowStateBadge state={ticket.workflowState} />
      ),
    },
    {
      header: 'Öffentlicher Status',
      id: 'status',
      mobileLabel: 'Status',
      render: (ticket) => (
        <TicketStatusBadge status={ticket.currentStatus?.status ?? null} />
      ),
      sort: createColumnSort('status', 'Status', sort, onSortChange),
    },
    {
      header: 'Behörde',
      id: 'office',
      render: (ticket) => ticket.office?.name ?? 'Noch nicht zugeordnet',
    },
    {
      header: 'Aktuelle Bearbeitung',
      id: 'responsibility',
      render: getTicketCurrentResponsibilityLabel,
    },
    {
      header: 'Zuletzt geändert',
      id: 'updatedAt',
      mobileLabel: 'Geändert',
      render: (ticket) => (
        <time dateTime={ticket.updatedAt}>
          {formatDisplayDateTime(ticket.updatedAt)}
        </time>
      ),
      sort: createColumnSort(
        'updatedAt',
        'Änderungsdatum',
        sort,
        onSortChange,
      ),
    },
    {
      align: 'end',
      header: 'Aktionen',
      id: 'actions',
      isAction: true,
      render: (ticket) => (
        <LinkButton
          aria-label={`${ticket.title} öffnen`}
          size="sm"
          state={navigationState}
          to={`/tickets/${ticket.id}`}
          variant="outline"
        >
          Details
          <ExternalLink aria-hidden="true" size={16} />
        </LinkButton>
      ),
    },
  ]
}

/** Connects one sortable column to the feature-owned URL sort state. */
function createColumnSort(
  field: TicketDirectorySortField,
  sortLabel: string,
  sort: DataViewSort<TicketDirectorySortField> | null,
  onSortChange: (sort: DataViewSort<TicketDirectorySortField>) => void,
) {
  return {
    direction: sort?.field === field ? sort.direction : null,
    onChange: (direction: 'asc' | 'desc') =>
      onSortChange({ direction, field }),
    sortLabel,
  }
}
