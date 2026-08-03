import { ExternalLink } from 'lucide-react'
import { Link, useLocation } from 'react-router'

import { getRoleLabel } from '@/auth/role-labels'
import type { UserDirectorySortField } from '@/features/users/model/user-directory'
import {
  getUserDisplayName,
  type UserRecord,
} from '@/features/users/model/user-model'
import { UserOfficeName } from '@/features/users/components/UserOfficeName'
import { UserStatusBadge } from '@/features/users/components/UserStatusBadge'
import {
  ResponsiveDataView,
  type DataViewColumn,
} from '@/shared/data-view/ResponsiveDataView'
import type { DataViewSort } from '@/shared/data-view/data-view-url-state'
import { createResourceDetailNavigationState } from '@/shared/resource-detail/detail-navigation'
import type { OfficeReference } from '@/shared/offices/office-model'
import { formatDisplayDate } from '@/shared/format/display-values'
import { LinkButton } from '@/shared/ui/LinkButton'

export interface UserDirectoryViewProps {
  items: readonly UserRecord[]
  offices: readonly OfficeReference[]
  onSortChange: (sort: DataViewSort<UserDirectorySortField>) => void
  sort: DataViewSort<UserDirectorySortField> | null
}

/** Presents users as a desktop table and device-appropriate compact cards. */
export function UserDirectoryView({
  items,
  offices,
  onSortChange,
  sort,
}: UserDirectoryViewProps) {
  const location = useLocation()
  const navigationState = createResourceDetailNavigationState(location)
  const columns = createUserColumns({
    navigationState,
    offices,
    onSortChange,
    sort,
  })

  return (
    <ResponsiveDataView
      caption="Benutzerverzeichnis"
      columns={columns}
      compactListClassName="sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0"
      getItemLabel={getUserDisplayName}
      getRowKey={(item) => item.id}
      items={items}
      tableBreakpoint="lg"
    />
  )
}

type CreateUserColumnsInput = Readonly<{
  navigationState: ReturnType<typeof createResourceDetailNavigationState>
  offices: readonly OfficeReference[]
  onSortChange: (sort: DataViewSort<UserDirectorySortField>) => void
  sort: DataViewSort<UserDirectorySortField> | null
}>

/** Defines one shared information hierarchy for table rows and compact cards. */
function createUserColumns({
  navigationState,
  offices,
  onSortChange,
  sort,
}: CreateUserColumnsInput): readonly DataViewColumn<UserRecord>[] {
  return [
    {
      header: 'Name',
      id: 'name',
      isRowHeader: true,
      render: (user) => (
        <Link
          className="text-primary focus-visible:outline-primary rounded-sm underline decoration-2 underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
          state={navigationState}
          to={`/users/${user.id}`}
        >
          {getUserDisplayName(user)}
        </Link>
      ),
      sort: createColumnSort('lastName', 'Nachname', sort, onSortChange),
    },
    {
      header: 'E-Mail-Adresse',
      id: 'email',
      render: (user) => (
        <a
          className="text-primary focus-visible:outline-primary rounded-sm break-all underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
          href={`mailto:${user.email}`}
        >
          {user.email}
        </a>
      ),
      sort: createColumnSort('email', 'E-Mail-Adresse', sort, onSortChange),
    },
    {
      header: 'Rolle',
      id: 'role',
      render: (user) => getRoleLabel(user.role),
      sort: createColumnSort('role', 'Rolle', sort, onSortChange),
    },
    {
      header: 'Behörde',
      id: 'office',
      render: (user) => (
        <UserOfficeName officeId={user.officeId} offices={offices} />
      ),
    },
    {
      header: 'Status',
      id: 'status',
      render: (user) => <UserStatusBadge isActive={user.isActive} />,
    },
    {
      header: 'Erstellt am',
      id: 'createdAt',
      mobileLabel: 'Erstellt',
      render: (user) => formatDisplayDate(user.createdAt),
      sort: createColumnSort('createdAt', 'Erstellungsdatum', sort, onSortChange),
    },
    {
      align: 'end',
      header: 'Aktionen',
      id: 'actions',
      isAction: true,
      render: (user) => (
        <LinkButton
          aria-label={`${getUserDisplayName(user)} öffnen`}
          size="sm"
          state={navigationState}
          to={`/users/${user.id}`}
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
  field: UserDirectorySortField,
  sortLabel: string,
  sort: DataViewSort<UserDirectorySortField> | null,
  onSortChange: (sort: DataViewSort<UserDirectorySortField>) => void,
) {
  return {
    direction: sort?.field === field ? sort.direction : null,
    onChange: (direction: 'asc' | 'desc') =>
      onSortChange({ direction, field }),
    sortLabel,
  }
}
