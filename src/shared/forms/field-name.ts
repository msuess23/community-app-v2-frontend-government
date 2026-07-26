export function fieldNameToId(name: string): string {
  const normalizedName = name
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `field-${normalizedName || 'input'}`
}
