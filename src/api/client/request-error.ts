/** Returns whether a request stopped because its AbortSignal was cancelled. */
export function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'AbortError'
  )
}

/** Stops auth refresh and retry work after the owning query was cancelled. */
export function throwIfRequestAborted(
  signal: AbortSignal | null | undefined,
): void {
  if (!signal?.aborted) {
    return
  }

  throw (
    signal.reason ?? new DOMException('The request was aborted.', 'AbortError')
  )
}
