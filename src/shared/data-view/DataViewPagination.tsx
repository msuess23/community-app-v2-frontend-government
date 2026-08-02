import type { ChangeEvent } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import {
  clampPage,
  getPageCount,
  getVisiblePages,
} from '@/shared/data-view/pagination'
import { Button } from '@/shared/ui/Button'

export interface DataViewPaginationProps {
  label?: string
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  page: number
  pageSize: number
  pageSizeOptions?: readonly number[]
  total: number
}

/** Renders result context, page-size selection and keyboard-accessible pagination. */
export function DataViewPagination({
  label = 'Seitennavigation',
  onPageChange,
  onPageSizeChange,
  page,
  pageSize,
  pageSizeOptions = [10, 20, 50],
  total,
}: DataViewPaginationProps) {
  const pageCount = getPageCount(total, pageSize)
  const currentPage = clampPage(page, pageCount)
  const visiblePages = getVisiblePages(currentPage, pageCount)
  const firstResult = total === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const lastResult = Math.min(currentPage * pageSize, total)

  return (
    <div className="border-outline-variant bg-surface flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
        <p aria-live="polite" className="text-on-surface-variant text-sm">
          {total === 0
            ? 'Keine Ergebnisse'
            : `${firstResult}–${lastResult} von ${total} Ergebnissen`}
        </p>

        <label className="flex items-center gap-2 text-sm font-medium">
          <span>Einträge pro Seite</span>
          <select
            className="border-outline bg-surface focus-visible:border-primary focus-visible:ring-primary min-h-10 rounded-lg border px-2 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              onPageSizeChange(Number(event.currentTarget.value))
            }
            value={pageSize}
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      {total > 0 ? (
        <nav
          aria-label={label}
          className="flex items-center justify-between gap-2 sm:justify-end"
        >
          <Button
            aria-label="Vorherige Seite"
            isDisabled={currentPage <= 1}
            onPress={() => onPageChange(currentPage - 1)}
            size="sm"
            type="button"
            variant="outline"
          >
            <ChevronLeft aria-hidden="true" size={18} />
            <span className="sm:hidden lg:inline">Zurück</span>
          </Button>

          <div className="hidden items-center gap-1 sm:flex">
            {visiblePages.map((item) =>
              typeof item === 'number' ? (
                <Button
                  aria-current={item === currentPage ? 'page' : undefined}
                  aria-label={`Seite ${item}`}
                  className="min-w-10 px-2"
                  key={item}
                  onPress={() => onPageChange(item)}
                  size="sm"
                  type="button"
                  variant={item === currentPage ? 'primary' : 'ghost'}
                >
                  {item}
                </Button>
              ) : (
                <span aria-hidden="true" className="px-1" key={item}>
                  …
                </span>
              ),
            )}
          </div>

          <span className="text-on-surface-variant text-sm sm:hidden">
            Seite {currentPage} von {pageCount}
          </span>

          <Button
            aria-label="Nächste Seite"
            isDisabled={currentPage >= pageCount}
            onPress={() => onPageChange(currentPage + 1)}
            size="sm"
            type="button"
            variant="outline"
          >
            <span className="sm:hidden lg:inline">Weiter</span>
            <ChevronRight aria-hidden="true" size={18} />
          </Button>
        </nav>
      ) : null}
    </div>
  )
}
