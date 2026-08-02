import type { Location } from 'react-router'

export type ResourceDetailNavigationState = Readonly<{
  from: string
}>

type LocationParts = Pick<Location, 'hash' | 'pathname' | 'search'>

/** Captures the current internal URL so a detail page can return to its exact list state. */
export function createResourceDetailNavigationState(
  location: LocationParts,
): ResourceDetailNavigationState {
  return {
    from: `${location.pathname}${location.search}${location.hash}`,
  }
}

/** Resolves a safe internal return target and rejects external or malformed locations. */
export function resolveResourceDetailReturnTo(
  state: unknown,
  fallback: string,
): string {
  const from = readReturnLocation(state)
  return from && isSafeInternalLocation(from) ? from : fallback
}

/** Reads the optional router state without trusting its runtime shape. */
function readReturnLocation(state: unknown): string | undefined {
  if (typeof state !== 'object' || state === null || !('from' in state)) {
    return undefined
  }

  const from = state.from
  return typeof from === 'string' && from.trim() ? from.trim() : undefined
}

/** Accepts only same-application absolute paths and blocks protocol-relative redirects. */
function isSafeInternalLocation(value: string): boolean {
  return (
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.includes('\\') &&
    !containsAsciiControlCharacter(value)
  )
}

/** Detects control characters without embedding them in a regular expression. */
function containsAsciiControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    if (code <= 0x1f || code === 0x7f) {
      return true
    }
  }

  return false
}
