import { queryOptions } from '@tanstack/react-query'

import type { LifecycleStatusFilter } from '@/api/generated/models'
import {
  getAllOfficesApiV1OfficesGet,
  getOfficeApiV1OfficesOfficeIdGet,
} from '@/api/generated/offices/offices'
import { mapOfficeReference } from '@/shared/offices/office-mapper'
import type { OfficeReference } from '@/shared/offices/office-model'
import { createResourceQueryKeys } from '@/shared/remote-data/query-keys'

const OFFICE_PAGE_SIZE = 100

export const officeQueryKeys = createResourceQueryKeys<
  Readonly<{ status: LifecycleStatusFilter }>,
  string
>('offices')

/** Creates a query for one office name used by account and detail summaries. */
export function createOfficeReferenceQueryOptions(officeId: string) {
  return queryOptions({
    queryFn: async ({ signal }) =>
      mapOfficeReference(
        await getOfficeApiV1OfficesOfficeIdGet(officeId, { signal }),
      ),
    queryKey: officeQueryKeys.detail(officeId),
    staleTime: 5 * 60 * 1000,
  })
}

/** Loads every visible office so native filter controls remain complete and keyboard friendly. */
export function createOfficeDirectoryQueryOptions(
  status: LifecycleStatusFilter,
) {
  return queryOptions({
    queryFn: ({ signal }) => loadAllVisibleOffices(status, signal),
    queryKey: officeQueryKeys.list({ status }),
    staleTime: 5 * 60 * 1000,
  })
}

/** Traverses the bounded office API until every visible option has been loaded. */
async function loadAllVisibleOffices(
  status: LifecycleStatusFilter,
  signal: AbortSignal,
): Promise<readonly OfficeReference[]> {
  const offices: OfficeReference[] = []
  let page = 1
  let pageCount = 1

  do {
    const response = await getAllOfficesApiV1OfficesGet(
      {
        order: 'asc',
        page,
        size: OFFICE_PAGE_SIZE,
        sort_by: 'name',
        status,
      },
      { signal },
    )

    offices.push(...response.data.map(mapOfficeReference))
    pageCount = response.pages
    page += 1
  } while (page <= pageCount)

  return offices
}
