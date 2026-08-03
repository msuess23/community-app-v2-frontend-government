import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'

import type { DataViewSortDirection } from '@/shared/data-view/data-view-url-state'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'

export type DataViewColumnSort = Readonly<{
  direction: DataViewSortDirection | null
  onChange: (direction: DataViewSortDirection) => void
  sortLabel: string
}>

export type DataViewColumn<TItem> = Readonly<{
  align?: 'end' | 'start'
  header: ReactNode
  id: string
  isAction?: boolean
  isRowHeader?: boolean
  mobileLabel?: ReactNode
  render: (item: TItem) => ReactNode
  sort?: DataViewColumnSort
}>

export interface ResponsiveDataViewProps<TItem> {
  caption: string
  columns: readonly DataViewColumn<TItem>[]
  compactListClassName?: string
  getItemLabel: (item: TItem) => string
  getRowKey: (item: TItem) => string
  items: readonly TItem[]
  tableBreakpoint?: 'md' | 'lg'
}

/** Renders one data set as a semantic table on wide screens and cards on small screens. */
export function ResponsiveDataView<TItem>({
  caption,
  columns,
  compactListClassName,
  getItemLabel,
  getRowKey,
  items,
  tableBreakpoint = 'md',
}: ResponsiveDataViewProps<TItem>) {
  const rowHeaderColumn = getRowHeaderColumn(columns)
  const detailColumns = columns.filter(
    (column) => column !== rowHeaderColumn && !column.isAction,
  )
  const actionColumns = columns.filter((column) => column.isAction)

  const tableVisibility =
    tableBreakpoint === 'lg' ? 'hidden lg:block' : 'hidden md:block'
  const compactVisibility =
    tableBreakpoint === 'lg' ? 'lg:hidden' : 'md:hidden'

  return (
    <>
      <div
        className={cn(
          'border-outline-variant bg-surface overflow-x-auto rounded-xl border shadow-sm',
          tableVisibility,
        )}
      >
        <table className="min-w-full border-collapse">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-surface-container">
            <tr>
              {columns.map((column) => (
                <DataViewTableHeader column={column} key={column.id} />
              ))}
            </tr>
          </thead>
          <tbody className="divide-outline-variant divide-y">
            {items.map((item) => (
              <tr
                className="hover:bg-surface-container-low"
                key={getRowKey(item)}
              >
                {columns.map((column) => {
                  const content = column.render(item)
                  const className = cn(
                    'px-4 py-4 text-sm align-top',
                    column.align === 'end' && 'text-right',
                  )

                  return column === rowHeaderColumn ? (
                    <th
                      className={cn(className, 'font-semibold')}
                      key={column.id}
                      scope="row"
                    >
                      {content}
                    </th>
                  ) : (
                    <td className={className} key={column.id}>
                      {content}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul
        aria-label={caption}
        className={cn('space-y-3', compactVisibility, compactListClassName)}
      >
        {items.map((item) => {
          const itemLabel = getItemLabel(item)

          return (
            <li key={getRowKey(item)}>
              <Card padding="sm">
                <article aria-label={itemLabel}>
                  <h3 className="text-on-surface text-base font-semibold">
                    {rowHeaderColumn.render(item)}
                  </h3>

                  {detailColumns.length > 0 ? (
                    <dl className="mt-4 grid gap-3">
                      {detailColumns.map((column) => (
                        <div
                          className="grid grid-cols-[minmax(7rem,0.8fr)_minmax(0,1.2fr)] gap-3"
                          key={column.id}
                        >
                          <dt className="text-on-surface-variant text-sm font-medium">
                            {column.mobileLabel ?? column.header}
                          </dt>
                          <dd
                            className={cn(
                              'min-w-0 text-sm',
                              column.align === 'end' && 'text-right',
                            )}
                          >
                            {column.render(item)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}

                  {actionColumns.length > 0 ? (
                    <div
                      aria-label={`Aktionen für ${itemLabel}`}
                      className="border-outline-variant mt-4 flex flex-wrap gap-2 border-t pt-4"
                      role="group"
                    >
                      {actionColumns.map((column) => (
                        <div key={column.id}>{column.render(item)}</div>
                      ))}
                    </div>
                  ) : null}
                </article>
              </Card>
            </li>
          )
        })}
      </ul>
    </>
  )
}

/** Renders a semantic column heading with optional sorting controls. */
function DataViewTableHeader<TItem>({
  column,
}: Readonly<{ column: DataViewColumn<TItem> }>) {
  const sort = column.sort
  const ariaSort = getAriaSort(sort?.direction)

  return (
    <th
      aria-sort={sort ? ariaSort : undefined}
      className={cn(
        'text-on-surface px-4 py-3 text-left text-xs font-semibold tracking-wide uppercase',
        column.align === 'end' && 'text-right',
      )}
      scope="col"
    >
      {sort ? (
        <Button
          aria-label={getNextSortLabel(sort)}
          className={cn(
            '-mx-2 min-h-9 px-2 text-current',
            column.align === 'end' && 'ml-auto',
          )}
          onPress={() => sort.onChange(getNextDirection(sort.direction))}
          size="sm"
          type="button"
          variant="ghost"
        >
          {column.header}
          <SortIcon direction={sort.direction} />
        </Button>
      ) : (
        column.header
      )}
    </th>
  )
}

/** Selects the visual indicator for the current sort state. */
function SortIcon({
  direction,
}: Readonly<{ direction: DataViewSortDirection | null }>) {
  if (direction === 'asc') {
    return <ArrowUp aria-hidden="true" size={16} />
  }

  if (direction === 'desc') {
    return <ArrowDown aria-hidden="true" size={16} />
  }

  return <ArrowUpDown aria-hidden="true" size={16} />
}

/** Toggles between ascending and descending sort requests. */
function getNextDirection(
  direction: DataViewSortDirection | null,
): DataViewSortDirection {
  return direction === 'asc' ? 'desc' : 'asc'
}

/** Maps application sort directions to the table aria-sort vocabulary. */
function getAriaSort(
  direction: DataViewSortDirection | null | undefined,
): 'ascending' | 'descending' | 'none' {
  if (direction === 'asc') {
    return 'ascending'
  }

  if (direction === 'desc') {
    return 'descending'
  }

  return 'none'
}

/** Describes the result of activating a sortable column heading. */
function getNextSortLabel(sort: DataViewColumnSort): string {
  const direction = getNextDirection(sort.direction)

  return `Nach ${sort.sortLabel} ${
    direction === 'asc' ? 'aufsteigend' : 'absteigend'
  } sortieren`
}

/** Selects the semantic row header and rejects unusable column definitions. */
function getRowHeaderColumn<TItem>(
  columns: readonly DataViewColumn<TItem>[],
): DataViewColumn<TItem> {
  const column =
    columns.find((candidate) => candidate.isRowHeader) ?? columns[0]

  if (!column) {
    throw new Error('ResponsiveDataView requires at least one column.')
  }

  return column
}
