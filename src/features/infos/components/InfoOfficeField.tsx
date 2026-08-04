import type { Control } from 'react-hook-form'

import type { AuthUser } from '@/auth/auth-types'
import type { InfoFormValues } from '@/features/infos/model/info-form'
import type { InfoRecord } from '@/features/infos/model/info-model'
import { ControlledSelectField } from '@/shared/forms/ControlledSelectField'
import type { OfficeReference } from '@/shared/offices/office-model'

/** Applies role-dependent office assignment controls without weakening backend ownership rules. */
export function InfoOfficeField({
  control,
  currentUser,
  info,
  offices,
}: Readonly<{
  control: Control<InfoFormValues>
  currentUser: AuthUser
  info?: InfoRecord
  offices: readonly OfficeReference[]
}>) {
  if (currentUser.role === 'ADMIN') {
    return (
      <ControlledSelectField
        control={control}
        description="Administratoren können eine aktive Behörde auswählen oder eine behördenübergreifende Mitteilung veröffentlichen."
        label="Zuständige Behörde"
        name="officeId"
        options={offices.map((office) => ({
          description: office.isActive ? undefined : 'deaktiviert',
          isDisabled: !office.isActive && office.id !== info?.officeId,
          label: office.name,
          value: office.id,
        }))}
        placeholder="Behördenübergreifende Mitteilung"
      />
    )
  }

  const office = offices.find((item) => item.id === currentUser.officeId)

  return (
    <div className="border-outline-variant bg-surface-container rounded-xl border p-4">
      <p className="text-on-surface-variant text-sm font-medium">
        Zuständige Behörde
      </p>
      <p className="mt-1 font-semibold">
        {office?.name ?? 'Eigene Behörde konnte nicht geladen werden'}
      </p>
      <p className="text-on-surface-variant mt-2 text-sm leading-6">
        Officer und Manager können Mitteilungen ausschließlich für ihre eigene
        Behörde anlegen und bearbeiten. Die Zuordnung kann hier nicht geändert
        werden.
      </p>
    </div>
  )
}
