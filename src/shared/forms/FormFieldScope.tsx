import { useId, useMemo, type ReactNode } from 'react'

import { fieldNameToId, normalizeFieldName } from '@/shared/forms/field-name'
import {
  FormFieldScopeContext,
  type FormFieldScopeValue,
} from '@/shared/forms/form-field-scope-context'

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
