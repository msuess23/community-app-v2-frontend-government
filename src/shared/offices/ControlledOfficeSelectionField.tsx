import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { Control, FieldPath, FieldValues } from 'react-hook-form'

import { ControlledSearchableSelectField } from '@/shared/forms/ControlledSearchableSelectField'
import {
  createOfficeDirectoryQueryOptions,
  createOfficeReferenceQueryOptions,
} from '@/shared/offices/office-queries'
import type { SelectFieldOption } from '@/shared/ui/SelectField'

export interface ControlledOfficeSelectionFieldProps<
  TFieldValues extends FieldValues,
> {
  control: Control<TFieldValues>
  currentOfficeId?: string | null
  description?: string
  isDisabled?: boolean
  isRequired?: boolean
  label?: string
  name: FieldPath<TFieldValues>
}

/** Loads active offices and exposes them through the reusable searchable-select pattern. */
export function ControlledOfficeSelectionField<
  TFieldValues extends FieldValues,
>({
  control,
  currentOfficeId = null,
  description,
  isDisabled = false,
  isRequired = false,
  label = 'Behörde',
  name,
}: ControlledOfficeSelectionFieldProps<TFieldValues>) {
  const directoryQuery = useQuery(createOfficeDirectoryQueryOptions('active'))
  const currentOfficeIsActive =
    currentOfficeId !== null &&
    Boolean(
      directoryQuery.data?.some((office) => office.id === currentOfficeId),
    )
  const currentOfficeQuery = useQuery({
    ...createOfficeReferenceQueryOptions(currentOfficeId ?? ''),
    enabled:
      currentOfficeId !== null &&
      directoryQuery.isSuccess &&
      !currentOfficeIsActive,
  })
  const options = useMemo<readonly SelectFieldOption[]>(() => {
    const activeOptions = (directoryQuery.data ?? []).map((office) => ({
      label: office.name,
      value: office.id,
    }))
    const currentOffice = currentOfficeQuery.data
    const hasCurrentOffice =
      currentOfficeId !== null &&
      activeOptions.some((option) => option.value === currentOfficeId)

    if (currentOfficeId !== null && !hasCurrentOffice) {
      return [
        {
          description: currentOffice
            ? currentOffice.isActive
              ? 'Aktuelle Zuordnung'
              : 'Aktuelle Zuordnung, nicht mehr aktiv'
            : currentOfficeQuery.isError
              ? 'Aktuelle Zuordnung konnte nicht geladen werden'
              : 'Aktuelle Zuordnung wird geladen',
          isDisabled: currentOffice ? !currentOffice.isActive : true,
          label: currentOffice?.name ?? 'Aktuelle Behördenzuordnung',
          value: currentOfficeId,
        },
        ...activeOptions,
      ]
    }

    return activeOptions
  }, [
    currentOfficeId,
    currentOfficeQuery.data,
    currentOfficeQuery.isError,
    directoryQuery.data,
  ])

  const loading = directoryQuery.isLoading
  const failed = directoryQuery.isError

  return (
    <ControlledSearchableSelectField
      control={control}
      description={
        failed
          ? 'Die verfügbaren Behörden konnten nicht geladen werden. Lade die Seite neu und versuche es erneut.'
          : description
      }
      disabled={isDisabled || loading || failed}
      emptySearchMessage="Keine aktiven Behörden entsprechen der Suche."
      label={label}
      required={isRequired}
      name={name}
      options={options}
      placeholder={
        loading
          ? 'Behörden werden geladen …'
          : isRequired
            ? 'Aktive Behörde auswählen'
            : 'Keine Behörde zugeordnet'
      }
      searchLabel="Behörden durchsuchen"
      searchPlaceholder="Name der Behörde"
    />
  )
}
