import type { OfficeReference } from '@/shared/offices/office-model'
import { OfficeName } from '@/shared/offices/OfficeName'

export interface UserOfficeNameProps {
  officeId: string | null
  offices?: readonly OfficeReference[]
}

/** Uses an already loaded directory before falling back to the shared office query. */
export function UserOfficeName({ officeId, offices }: UserOfficeNameProps) {
  if (officeId === null) {
    return <>Keine Behörde zugeordnet</>
  }

  const office = offices?.find((candidate) => candidate.id === officeId)

  return office ? <>{office.name}</> : <OfficeName officeId={officeId} />
}
