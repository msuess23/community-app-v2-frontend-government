import { useEffect, useRef } from 'react'
import { useLocation, useMatches } from 'react-router'

const APPLICATION_TITLE = 'Community-App Behördenclient'

export type AppRouteHandle = Readonly<{
  pageTitle?: string
}>

type RouteMatchWithHandle = Readonly<{
  handle?: unknown
}>

/**
 * Keeps the document title and keyboard focus synchronized with route changes.
 */
export function useRouteLifecycle(): void {
  const location = useLocation()
  const matches = useMatches()
  const previousPathname = useRef(location.pathname)

  useEffect(() => {
    document.title = getDocumentTitle(matches)
  }, [matches])

  useEffect(() => {
    if (previousPathname.current === location.pathname) {
      return
    }

    previousPathname.current = location.pathname

    // Prefer the page heading so assistive technology announces the new context.
    const focusTarget =
      document.querySelector<HTMLElement>('[data-page-heading]') ??
      document.getElementById('main-content')

    focusTarget?.focus()
  }, [location.pathname])
}

/**
 * Builds the browser title from the deepest route that provides page metadata.
 */
export function getDocumentTitle(
  matches: readonly RouteMatchWithHandle[],
): string {
  const pageTitle = [...matches]
    .reverse()
    .map((match) => getPageTitle(match.handle))
    .find((title): title is string => Boolean(title))

  return pageTitle ? `${pageTitle} · ${APPLICATION_TITLE}` : APPLICATION_TITLE
}

/**
 * Reads a page title from unknown route metadata without trusting its shape.
 */
function getPageTitle(handle: unknown): string | undefined {
  if (
    typeof handle !== 'object' ||
    handle === null ||
    !('pageTitle' in handle)
  ) {
    return undefined
  }

  const pageTitle = handle.pageTitle
  return typeof pageTitle === 'string' ? pageTitle : undefined
}
