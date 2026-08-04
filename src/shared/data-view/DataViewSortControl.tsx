import { useId, type ChangeEvent } from 'react'

import { cn } from '@/shared/lib/cn'

import type {
  DataViewSort,
  DataViewSortDirection,
} from '@/shared/data-view/data-view-url-state'

export type DataViewSortOption<TSortField extends string> = Readonly<{
  ascendingLabel?: string
  descendingLabel?: string
  field: TSortField
  label: string
}>

export interface DataViewSortControlProps<TSortField extends string> {
  className?: string
  label?: string
  noneLabel?: string
  onChange: (sort: DataViewSort<TSortField> | null) => void
  options: readonly DataViewSortOption<TSortField>[]
  value: DataViewSort<TSortField> | null
}

/** Exposes table sorting through a select that also works in compact card layouts. */
export function DataViewSortControl<TSortField extends string>({
  className,
  label = 'Sortierung',
  noneLabel = 'Standardsortierung',
  onChange,
  options,
  value,
}: DataViewSortControlProps<TSortField>) {
  const selectId = useId()
  const serializedValue = value
    ? serializeSortValue(value.field, value.direction)
    : ''

  /** Decodes the compact select value into feature sort state. */
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const parsedValue = parseSortValue(event.currentTarget.value, options)
    onChange(parsedValue)
  }

  return (
    <div className={cn('grid gap-2 lg:w-56 xl:w-64', className)}>
      <label
        className="text-on-surface text-sm font-semibold"
        htmlFor={selectId}
      >
        {label}
      </label>
      <select
        className="border-outline bg-surface text-on-surface hover:border-secondary focus-visible:border-primary focus-visible:ring-primary min-h-11 w-full rounded-lg border px-3 py-2.5 text-base shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        id={selectId}
        onChange={handleChange}
        value={serializedValue}
      >
        <option value="">{noneLabel}</option>
        {options.flatMap((option) => [
          <option
            key={serializeSortValue(option.field, 'asc')}
            value={serializeSortValue(option.field, 'asc')}
          >
            {option.ascendingLabel ?? `${option.label} – aufsteigend`}
          </option>,
          <option
            key={serializeSortValue(option.field, 'desc')}
            value={serializeSortValue(option.field, 'desc')}
          >
            {option.descendingLabel ?? `${option.label} – absteigend`}
          </option>,
        ])}
      </select>
    </div>
  )
}

/** Encodes a sort pair into one stable select value. */
function serializeSortValue(
  field: string,
  direction: DataViewSortDirection,
): string {
  return `${field}:${direction}`
}

/** Decodes only sort values represented by the supplied options. */
function parseSortValue<TSortField extends string>(
  value: string,
  options: readonly DataViewSortOption<TSortField>[],
): DataViewSort<TSortField> | null {
  const separatorIndex = value.lastIndexOf(':')

  if (separatorIndex <= 0) {
    return null
  }

  const field = value.slice(0, separatorIndex)
  const direction = value.slice(separatorIndex + 1)
  const option = options.find((candidate) => candidate.field === field)

  if (!option || (direction !== 'asc' && direction !== 'desc')) {
    return null
  }

  return { direction, field: option.field }
}
