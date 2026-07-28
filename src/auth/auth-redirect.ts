type ReturnLocation = Readonly<{
  hash?: string
  pathname: string
  search?: string
}>

const AUTH_ENTRY_PATHS = new Set([
  '/login',
  '/password-forgotten',
  '/password-reset',
  '/register',
])
const INTERNAL_ORIGIN = 'https://community-app.invalid'

export function createLoginPath(location: ReturnLocation): string {
  const returnTo = `${location.pathname}${location.search ?? ''}${location.hash ?? ''}`

  return `/login?returnTo=${encodeURIComponent(returnTo)}`
}

export function getSafeReturnTo(
  candidate: string | null | undefined,
  fallback = '/',
): string {
  if (
    !candidate ||
    !candidate.startsWith('/') ||
    candidate.startsWith('//') ||
    candidate.includes('\\')
  ) {
    return fallback
  }

  try {
    const parsed = new URL(candidate, INTERNAL_ORIGIN)

    if (
      parsed.origin !== INTERNAL_ORIGIN ||
      AUTH_ENTRY_PATHS.has(parsed.pathname)
    ) {
      return fallback
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return fallback
  }
}
