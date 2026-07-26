import { describe, expect, it } from 'vitest'
import { ZodError } from 'zod'

import { parseEnvironment } from '@/config/environment'

describe('parseEnvironment', () => {
  it('uses the local API path when no value is provided', () => {
    expect(parseEnvironment({})).toEqual({ apiBaseUrl: '/api/v1' })
  })

  it('removes a trailing slash from the configured API URL', () => {
    expect(
      parseEnvironment({ VITE_API_BASE_URL: 'https://example.test/api/v1/' }),
    ).toEqual({ apiBaseUrl: 'https://example.test/api/v1' })
  })

  it('rejects an explicitly empty API URL', () => {
    expect(() => parseEnvironment({ VITE_API_BASE_URL: ' ' })).toThrow(ZodError)
  })
})
