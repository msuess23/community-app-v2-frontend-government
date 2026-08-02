import { useMemo, useState } from 'react'
import { Eye } from 'lucide-react'

import {
  ActiveDataViewFilters,
  DataViewFilterPanel,
  DataViewFilterSelect,
} from '@/shared/data-view/DataViewFilters'
import { DataViewPagination } from '@/shared/data-view/DataViewPagination'
import { DataViewSearchField } from '@/shared/data-view/DataViewSearchField'
import { DataViewSortControl } from '@/shared/data-view/DataViewSortControl'
import { DataViewStatusBadge } from '@/shared/data-view/DataViewStatusBadge'
import {
  ResponsiveDataView,
  type DataViewColumn,
} from '@/shared/data-view/ResponsiveDataView'
import type {
  DataViewSort,
  DataViewSortDirection,
} from '@/shared/data-view/data-view-url-state'
import { formatDisplayDateTime } from '@/shared/format/display-values'
import { Button } from '@/shared/ui/Button'

const PAGE_SIZE_OPTIONS = [3, 5] as const

type ExampleSortField = 'title' | 'updatedAt'
type ExampleStatus = 'OPEN' | 'PROCESSING' | 'RESOLVED'

type ExampleItem = Readonly<{
  id: string
  office: string
  status: ExampleStatus
  title: string
  updatedAt: string
}>

const exampleItems: readonly ExampleItem[] = [
  {
    id: 'ticket-1042',
    office: 'Tiefbauamt',
    status: 'OPEN',
    title: 'Defekte Straßenbeleuchtung',
    updatedAt: '2026-07-31T08:15:00Z',
  },
  {
    id: 'ticket-1041',
    office: 'Ordnungsamt',
    status: 'PROCESSING',
    title: 'Beschädigtes Verkehrsschild',
    updatedAt: '2026-07-30T14:40:00Z',
  },
  {
    id: 'ticket-1040',
    office: 'Grünflächenamt',
    status: 'RESOLVED',
    title: 'Umgestürzter Ast im Park',
    updatedAt: '2026-07-29T11:05:00Z',
  },
  {
    id: 'ticket-1039',
    office: 'Abfallwirtschaft',
    status: 'OPEN',
    title: 'Überfüllter Papiercontainer',
    updatedAt: '2026-07-28T06:50:00Z',
  },
  {
    id: 'ticket-1038',
    office: 'Tiefbauamt',
    status: 'PROCESSING',
    title: 'Schlagloch an der Kreuzung',
    updatedAt: '2026-07-27T16:20:00Z',
  },
]

const statusOptions = [
  { label: 'Offen', value: 'OPEN' },
  { label: 'In Bearbeitung', value: 'PROCESSING' },
  { label: 'Erledigt', value: 'RESOLVED' },
] as const

const sortOptions = [
  { field: 'title', label: 'Titel' },
  { field: 'updatedAt', label: 'Aktualisierung' },
] as const

/** Demonstrates responsive list, filter, sort and pagination foundations. */
export function DataViewFoundationExample() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState<DataViewSort<ExampleSortField>>({
    direction: 'desc',
    field: 'updatedAt',
  })

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.toLocaleLowerCase('de-DE')
    const matchingItems = exampleItems.filter(
      (item) =>
        (normalizedSearch.length === 0 ||
          item.title.toLocaleLowerCase('de-DE').includes(normalizedSearch)) &&
        (status.length === 0 || item.status === status),
    )

    return [...matchingItems].sort((left, right) => {
      const comparison = left[sort.field].localeCompare(
        right[sort.field],
        'de-DE',
      )
      return sort.direction === 'asc' ? comparison : -comparison
    })
  }, [search, sort, status])

  const pageItems = filteredItems.slice(
    (page - 1) * pageSize,
    page * pageSize,
  )
  const columns: readonly DataViewColumn<ExampleItem>[] = [
    {
      header: 'Anliegen',
      id: 'title',
      isRowHeader: true,
      render: (item) => item.title,
      sort: {
        direction: getSortDirection(sort, 'title'),
        onChange: (direction) => updateSort('title', direction),
        sortLabel: 'Anliegen',
      },
    },
    {
      header: 'Status',
      id: 'status',
      render: (item) => <ExampleStatusBadge status={item.status} />,
    },
    {
      header: 'Behörde',
      id: 'office',
      render: (item) => item.office,
    },
    {
      header: 'Aktualisiert',
      id: 'updatedAt',
      render: (item) => formatDisplayDateTime(item.updatedAt),
      sort: {
        direction: getSortDirection(sort, 'updatedAt'),
        onChange: (direction) => updateSort('updatedAt', direction),
        sortLabel: 'Aktualisierung',
      },
    },
    {
      align: 'end',
      header: 'Aktionen',
      id: 'actions',
      isAction: true,
      render: (item) => (
        <Button
          aria-label={`Beispielanliegen „${item.title}“ öffnen`}
          size="sm"
          type="button"
          variant="ghost"
        >
          <Eye aria-hidden="true" size={17} />
          Öffnen
        </Button>
      ),
    },
  ]
  const activeFilters = [
    ...(search
      ? [
          {
            key: 'search',
            label: `Suche: ${search}`,
            onRemove: () => updateSearch(''),
          },
        ]
      : []),
    ...(status
      ? [
          {
            key: 'status',
            label:
              statusOptions.find((option) => option.value === status)?.label ??
              status,
            onRemove: () => updateStatus(''),
          },
        ]
      : []),
  ]

  /** Applies example search state and returns to the first result page. */
  function updateSearch(value: string) {
    setSearch(value)
    setPage(1)
  }

  /** Applies example status state and returns to the first result page. */
  function updateStatus(value: string) {
    setStatus(value)
    setPage(1)
  }

  /** Applies example sorting and returns to the first result page. */
  function updateSort(
    field: ExampleSortField,
    direction: DataViewSortDirection,
  ) {
    setSort({ direction, field })
    setPage(1)
  }

  /** Restores the unfiltered example result set. */
  function resetFilters() {
    setSearch('')
    setStatus('')
    setPage(1)
  }

  return (
    <div className="space-y-5">
      <DataViewSearchField onSearch={updateSearch} value={search} />

      <DataViewFilterPanel
        activeFilterCount={activeFilters.length}
        onReset={resetFilters}
      >
        <DataViewFilterSelect
          label="Status"
          onChange={updateStatus}
          options={statusOptions}
          value={status}
        />
        <DataViewSortControl
          onChange={(nextSort) => {
            if (nextSort) {
              setSort(nextSort)
              setPage(1)
            }
          }}
          options={sortOptions}
          value={sort}
        />
      </DataViewFilterPanel>

      <ActiveDataViewFilters filters={activeFilters} />

      {pageItems.length > 0 ? (
        <ResponsiveDataView
          caption="Beispielhafte Bürgeranliegen"
          columns={columns}
          getItemLabel={(item) => item.title}
          getRowKey={(item) => item.id}
          items={pageItems}
        />
      ) : (
        <p className="text-on-surface-variant rounded-xl border border-dashed border-outline p-6 text-center">
          Für diese Auswahl sind keine Beispielanliegen vorhanden.
        </p>
      )}

      <DataViewPagination
        onPageChange={setPage}
        onPageSizeChange={(nextPageSize) => {
          setPageSize(nextPageSize)
          setPage(1)
        }}
        page={page}
        pageSize={pageSize}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        total={filteredItems.length}
      />
    </div>
  )
}

/** Returns the active direction only for the requested example field. */
function getSortDirection(
  sort: DataViewSort<ExampleSortField>,
  field: ExampleSortField,
): DataViewSortDirection | null {
  return sort.field === field ? sort.direction : null
}

/** Maps example statuses to the shared semantic badge tones. */
function ExampleStatusBadge({ status }: Readonly<{ status: ExampleStatus }>) {
  if (status === 'OPEN') {
    return <DataViewStatusBadge tone="info">Offen</DataViewStatusBadge>
  }

  if (status === 'PROCESSING') {
    return (
      <DataViewStatusBadge tone="warning">In Bearbeitung</DataViewStatusBadge>
    )
  }

  return <DataViewStatusBadge tone="success">Erledigt</DataViewStatusBadge>
}
