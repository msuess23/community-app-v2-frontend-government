import { useQuery } from '@tanstack/react-query'

import { createOfficeReferenceQueryOptions } from '@/shared/offices/office-queries'

export interface OfficeNameProps {
  emptyLabel?: string
  officeId: string | null
}

/** Resolves an office identifier to a readable name with safe loading and error fallbacks. */
export function OfficeName({
  emptyLabel = 'Keine Behörde zugeordnet',
  officeId,
}: OfficeNameProps) {
  const query = useQuery({
    ...createOfficeReferenceQueryOptions(officeId ?? ''),
    enabled: officeId !== null,
  })

  if (officeId === null) {
    return <>{emptyLabel}</>
  }

  if (query.isLoading) {
    return <span aria-live="polite">Behörde wird geladen …</span>
  }

  if (query.data) {
    return <>{query.data.name}</>
  }

  return <span>Behörde konnte nicht geladen werden</span>
}
