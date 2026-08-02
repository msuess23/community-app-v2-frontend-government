/** Converts a form field path into an ID-safe suffix. */
export function normalizeFieldName(name: string): string {
  return (
    name
      .trim()
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'input'
  )
}

/** Builds a deterministic field ID, optionally scoped to one rendered form. */
export function fieldNameToId(name: string, scopeId?: string): string {
  const fieldName = normalizeFieldName(name)
  return scopeId ? `${scopeId}-${fieldName}` : `field-${fieldName}`
}
