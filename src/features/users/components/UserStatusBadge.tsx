import { DataViewStatusBadge } from '@/shared/data-view/DataViewStatusBadge'

/** Presents the user lifecycle state with text and a non-color-only badge. */
export function UserStatusBadge({ isActive }: Readonly<{ isActive: boolean }>) {
  return (
    <DataViewStatusBadge tone={isActive ? 'success' : 'neutral'}>
      {isActive ? 'Aktiv' : 'Deaktiviert'}
    </DataViewStatusBadge>
  )
}
