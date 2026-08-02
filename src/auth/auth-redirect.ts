type ReturnLocation = Readonly<{
  hash?: string
  pathname: string
  search?: string
}>

const NON_RETURN_PATHS = new Set([
  '/access-pending',
  '/login',
  '/password-forgotten',
  '/password-reset',
  '/register',
])
const INTERNAL_ORIGIN = 'https://community-app.invalid'

/**
 * Creates a login URL that preserves the requested internal destination.
 */
export function createLoginPath(location: ReturnLocation): string {
  const returnTo = `${location.pathname}${location.search ?? ''}${location.hash ?? ''}`

  return `/login?returnTo=${encodeURIComponent(returnTo)}`
}

/**
 * Accepts only safe internal return targets that do not reopen entry routes.
 */
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
      NON_RETURN_PATHS.has(parsed.pathname)
    ) {
      return fallback
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return fallback
  }
}
