import { describe, expect, it } from 'vitest'

import { isTrustedApiUrl, resolveApiUrl } from '@/api/client/api-url'

describe('API URL security', () => {
  it('trusts relative API paths on the browser origin', () => {
    expect(
      isTrustedApiUrl('/users/me', '/api/v1', 'https://client.example.test'),
    ).toBe(true)
    expect(resolveApiUrl('/users/me', '/api/v1')).toBe('/api/v1/users/me')
  })

  it('trusts absolute URLs only on the configured API origin', () => {
    expect(
      isTrustedApiUrl(
        'https://api.example.test/download/1',
        'https://api.example.test/api/v1',
        'https://client.example.test',
      ),
    ).toBe(true)
    expect(
      isTrustedApiUrl(
        'https://files.example.test/download/1',
        'https://api.example.test/api/v1',
        'https://client.example.test',
      ),
    ).toBe(false)
  })

  it('rejects protocol-relative and malformed destinations', () => {
    expect(
      isTrustedApiUrl(
        '//files.example.test/download/1',
        '/api/v1',
        'https://client.example.test',
      ),
    ).toBe(false)
    expect(
      isTrustedApiUrl(
        'https://[invalid',
        '/api/v1',
        'https://client.example.test',
      ),
    ).toBe(false)
  })
})
