import { environment } from '@/config/environment'

const ABSOLUTE_URL_PATTERN = /^[a-z][a-z\d+.-]*:\/\//i
const PROTOCOL_RELATIVE_URL_PATTERN = /^\/\//
const RELATIVE_ORIGIN = 'https://client.invalid'

/** Resolves an API path against the configured backend base URL. */
export function resolveApiUrl(
  requestUrl: string,
  baseUrl = environment.apiBaseUrl,
): string {
  if (
    ABSOLUTE_URL_PATTERN.test(requestUrl) ||
    PROTOCOL_RELATIVE_URL_PATTERN.test(requestUrl)
  ) {
    return requestUrl
  }

  const hasAbsoluteBase = ABSOLUTE_URL_PATTERN.test(baseUrl)
  const base = new URL(
    hasAbsoluteBase ? baseUrl : ensureLeadingSlash(baseUrl),
    RELATIVE_ORIGIN,
  )
  const request = new URL(ensureLeadingSlash(requestUrl), base.origin)
  const basePath = removeTrailingSlash(base.pathname)

  if (!containsBasePath(request.pathname, basePath)) {
    request.pathname = joinPaths(basePath, request.pathname)
  }

  if (hasAbsoluteBase) {
    request.protocol = base.protocol
    request.host = base.host
    return request.toString()
  }

  return `${request.pathname}${request.search}${request.hash}`
}

/** Checks whether managed credentials may be attached to the resolved request. */
export function isTrustedApiUrl(
  requestUrl: string,
  baseUrl = environment.apiBaseUrl,
  clientOrigin = getBrowserOrigin(),
): boolean {
  try {
    const origin = clientOrigin ?? RELATIVE_ORIGIN
    const resolvedRequest = new URL(resolveApiUrl(requestUrl, baseUrl), origin)
    const resolvedBase = new URL(baseUrl, origin)

    return resolvedRequest.origin === resolvedBase.origin
  } catch {
    return false
  }
}

function containsBasePath(pathname: string, basePath: string): boolean {
  return (
    basePath === '' ||
    basePath === '/' ||
    pathname === basePath ||
    pathname.startsWith(`${basePath}/`)
  )
}

function ensureLeadingSlash(value: string): string {
  return value.startsWith('/') ? value : `/${value}`
}

function joinPaths(left: string, right: string): string {
  return `${removeTrailingSlash(left)}/${right.replace(/^\/+/, '')}`
}

function removeTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

/** Reads the current client origin when URL resolution runs in a browser. */
function getBrowserOrigin(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }

  try {
    return window.location.origin
  } catch {
    return undefined
  }
}
