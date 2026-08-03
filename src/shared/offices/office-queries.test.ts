import { QueryClient } from '@tanstack/react-query'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'

import { createOfficeDirectoryQueryOptions } from '@/shared/offices/office-queries'
import { mockApiServer } from '@/test/server'

describe('office directory query', () => {
  it('loads every visible office page for complete native filter options', async () => {
    const requestedPages: number[] = []

    mockApiServer.use(
      http.get('http://localhost/api/v1/offices', ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get('page'))
        requestedPages.push(page)

        return HttpResponse.json({
          data: [
            {
              id: `00000000-0000-4000-8000-00000000000${page}`,
              metadata: {
                created_at: '2026-01-01T00:00:00Z',
                deactivated_at: null,
                is_active: true,
              },
              name: `Behörde ${page}`,
            },
          ],
          page,
          pages: 2,
          size: 100,
          total: 2,
        })
      }),
    )

    const client = new QueryClient()
    const offices = await client.fetchQuery(
      createOfficeDirectoryQueryOptions('active'),
    )

    expect(requestedPages).toEqual([1, 2])
    expect(offices.map((office) => office.name)).toEqual([
      'Behörde 1',
      'Behörde 2',
    ])
  })
})
