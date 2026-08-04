import type { InfoCategory, InfoStatus } from '@/api/generated/models'
import {
  getInfoCategoryLabel,
  getInfoStatusLabel,
} from '@/features/infos/model/info-model'
import {
  DataViewStatusBadge,
  type DataViewStatusTone,
} from '@/shared/data-view/DataViewStatusBadge'

/** Presents one localized Info category without relying on color alone. */
export function InfoCategoryBadge({
  category,
}: Readonly<{ category: InfoCategory }>) {
  return (
    <DataViewStatusBadge tone="neutral">
      {getInfoCategoryLabel(category)}
    </DataViewStatusBadge>
  )
}

/** Presents the backend status using a stable localized tone and label. */
export function InfoStatusBadge({
  status,
}: Readonly<{ status: InfoStatus }>) {
  return (
    <DataViewStatusBadge tone={getStatusTone(status)}>
      {getInfoStatusLabel(status)}
    </DataViewStatusBadge>
  )
}

function getStatusTone(status: InfoStatus): DataViewStatusTone {
  if (status === 'ACTIVE') {
    return 'success'
  }
  if (status === 'CANCELLED') {
    return 'danger'
  }
  if (status === 'SCHEDULED') {
    return 'info'
  }
  return 'neutral'
}
