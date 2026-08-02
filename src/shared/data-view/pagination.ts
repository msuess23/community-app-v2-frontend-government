export type PaginationItem = number | 'ellipsis-end' | 'ellipsis-start'

/** Calculates at least one logical page so navigation state remains stable. */
export function getPageCount(total: number, pageSize: number): number {
  if (!Number.isFinite(total) || total <= 0) {
    return 1
  }

  if (!Number.isFinite(pageSize) || pageSize <= 0) {
    return 1
  }

  return Math.max(1, Math.ceil(total / pageSize))
}

/** Keeps a requested page inside the available server result range. */
export function clampPage(page: number, pageCount: number): number {
  if (!Number.isInteger(page)) {
    return 1
  }

  return Math.min(Math.max(page, 1), Math.max(pageCount, 1))
}

/** Produces a compact page-number window with stable first and last pages. */
export function getVisiblePages(
  currentPage: number,
  pageCount: number,
): readonly PaginationItem[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1)
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, 'ellipsis-end', pageCount]
  }

  if (currentPage >= pageCount - 3) {
    return [
      1,
      'ellipsis-start',
      pageCount - 4,
      pageCount - 3,
      pageCount - 2,
      pageCount - 1,
      pageCount,
    ]
  }

  return [
    1,
    'ellipsis-start',
    currentPage - 1,
    currentPage,
    currentPage + 1,
    'ellipsis-end',
    pageCount,
  ]
}
