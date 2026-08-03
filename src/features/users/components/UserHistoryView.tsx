import { getRoleLabel } from '@/auth/role-labels'
import { UserOfficeName } from '@/features/users/components/UserOfficeName'
import { UserReferenceName } from '@/features/users/components/UserReferenceName'
import { UserStatusBadge } from '@/features/users/components/UserStatusBadge'
import type { UserHistoryRecord } from '@/features/users/model/user-history'
import {
  ResponsiveDataView,
  type DataViewColumn,
} from '@/shared/data-view/ResponsiveDataView'
import { formatDisplayDateTime } from '@/shared/format/display-values'

export interface UserHistoryViewProps {
  items: readonly UserHistoryRecord[]
}

/** Presents immutable user snapshots as desktop rows and device-appropriate cards. */
export function UserHistoryView({ items }: UserHistoryViewProps) {
  return (
    <ResponsiveDataView
      caption="Änderungshistorie des Benutzerkontos"
      columns={USER_HISTORY_COLUMNS}
      compactListClassName="sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0"
      getItemLabel={(item) =>
        `Änderungsstand vom ${formatDisplayDateTime(item.changedAt)}`
      }
      getRowKey={(item) => item.id}
      items={items}
      tableBreakpoint="lg"
    />
  )
}

const USER_HISTORY_COLUMNS: readonly DataViewColumn<UserHistoryRecord>[] = [
  {
    header: 'Geändert am',
    id: 'changedAt',
    isRowHeader: true,
    render: (item) => formatDisplayDateTime(item.changedAt),
  },
  {
    header: 'Änderungsgrund',
    id: 'reason',
    render: (item) => <span className="whitespace-pre-wrap">{item.changeReason}</span>,
  },
  {
    header: 'Kontostand',
    id: 'identity',
    render: (item) => (
      <span className="block min-w-48">
        <span className="block font-medium">
          {item.firstName} {item.lastName}
        </span>
        <span className="text-on-surface-variant block break-all text-xs">
          {item.email}
        </span>
      </span>
    ),
  },
  {
    header: 'Rolle',
    id: 'role',
    render: (item) => getRoleLabel(item.role),
  },
  {
    header: 'Behörde',
    id: 'office',
    render: (item) => <UserOfficeName officeId={item.officeId} />,
  },
  {
    header: 'Status',
    id: 'status',
    render: (item) => <UserStatusBadge isActive={item.isActive} />,
  },
  {
    header: 'Geändert durch',
    id: 'actor',
    render: (item) => <UserReferenceName userId={item.changedByUserId} />,
  },
]
