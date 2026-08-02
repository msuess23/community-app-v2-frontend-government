import {
  createContext,
  useContext,
  useId,
  useMemo,
  type ReactNode,
} from 'react'

import { fieldNameToId, normalizeFieldName } from '@/shared/forms/field-name'

type FormFieldScopeValue = Readonly<{
  getFieldId: (name: string) => string
}>

const FormFieldScopeContext = createContext<FormFieldScopeValue | null>(null)

export type FormFieldScopeProps = Readonly<{
  children: ReactNode
  id?: string
}>

/** Gives every field name a stable ID that is unique to one rendered form. */
export function FormFieldScope({ children, id }: FormFieldScopeProps) {
  const generatedId = useId()
  const scopeId = normalizeFieldName(id ?? `form-${generatedId}`)
  const value = useMemo<FormFieldScopeValue>(
    () => ({
      getFieldId: (name) => fieldNameToId(name, scopeId),
    }),
    [scopeId],
  )

  return (
    <FormFieldScopeContext.Provider value={value}>
      {children}
    </FormFieldScopeContext.Provider>
  )
}

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
