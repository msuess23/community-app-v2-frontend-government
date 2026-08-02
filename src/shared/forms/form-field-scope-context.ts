import { createContext, useContext } from 'react'

import { fieldNameToId } from '@/shared/forms/field-name'

export type FormFieldScopeValue = Readonly<{
  getFieldId: (name: string) => string
}>

export const FormFieldScopeContext = createContext<FormFieldScopeValue | null>(
  null,
)

/** Resolves a field ID from the nearest form scope or a legacy fallback. */
export function useFormFieldId(name: string, explicitId?: string): string {
  const scope = useContext(FormFieldScopeContext)
  return explicitId ?? scope?.getFieldId(name) ?? fieldNameToId(name)
}

/** Resolves field names for error summaries without requiring hook calls per item. */
export function useFormFieldIdResolver(): (name: string) => string {
  const scope = useContext(FormFieldScopeContext)
  return scope?.getFieldId ?? fieldNameToId
}
