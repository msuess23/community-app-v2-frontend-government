import { DataViewStatusBadge } from '@/shared/data-view/DataViewStatusBadge'

/** Presents an office lifecycle state with explicit text in addition to color. */
export function OfficeStatusBadge({
  isActive,
}: Readonly<{ isActive: boolean }>) {
  return (
    <DataViewStatusBadge tone={isActive ? 'success' : 'neutral'}>
      {isActive ? 'Aktiv' : 'Deaktiviert'}
    </DataViewStatusBadge>
  )
}
