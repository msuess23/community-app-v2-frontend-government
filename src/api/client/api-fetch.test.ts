import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/api/client/api-error'
import { apiFetch } from '@/api/client/api-fetch'
import { resolveApiUrl } from '@/api/client/api-url'

type FetchImplementation = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>

describe('resolveApiUrl', () => {
  it('adds the configured API path to an operation path', () => {
    expect(resolveApiUrl('/auth/login', '/api/v1')).toBe('/api/v1/auth/login')
  })

  it('does not duplicate an API path already present in the operation URL', () => {
    expect(resolveApiUrl('/api/v1/auth/login', '/api/v1')).toBe(
      '/api/v1/auth/login',
    )
  })

  it('supports an absolute API base URL', () => {
    expect(
      resolveApiUrl('/users/me?include=office', 'https://api.example/api/v1'),
    ).toBe('https://api.example/api/v1/users/me?include=office')
  })

  it('keeps an absolute operation URL unchanged', () => {
    expect(
      resolveApiUrl('https://files.example/document.pdf', '/api/v1'),
    ).toBe('https://files.example/document.pdf')
  })
})

describe('apiFetch', () => {
  const fetchMock = vi.fn<FetchImplementation>()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns a JSON response and uses the resolved API URL', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ id: 'user-1' }, { status: 200 }),
    )

    await expect(apiFetch<{ id: string }>('/users/me')).resolves.toEqual({
      id: 'user-1',
    })
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/users/me')
  })

  it('returns undefined for a no-content response', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))

    await expect(apiFetch<void>('/auth/logout')).resolves.toBeUndefined()
  })

  it('does not set a content type for FormData requests', async () => {
    const formData = new FormData()
    formData.append('title', 'Beispiel')
    fetchMock.mockResolvedValue(Response.json({ id: 'info-1' }))

    await apiFetch('/infos', {
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
        'X-Request-Id': 'request-1',
      },
      method: 'POST',
    })

    const request = fetchMock.mock.calls[0]?.[1]
    const headers = new Headers(request?.headers)

    expect(headers.has('Content-Type')).toBe(false)
    expect(headers.get('X-Request-Id')).toBe('request-1')
  })

  it('returns binary responses as blobs', async () => {
    fetchMock.mockResolvedValue(
      new Response('PDF', {
        headers: { 'Content-Type': 'application/pdf' },
      }),
    )

    const result = await apiFetch<Blob>('/documents/example', {
      responseType: 'blob',
    })

    expect(result.type).toBe('application/pdf')
    expect(result.size).toBe(3)
  })

  it('passes an abort signal to fetch', async () => {
    const controller = new AbortController()
    fetchMock.mockResolvedValue(Response.json({ ok: true }))

    await apiFetch('/health', { signal: controller.signal })

    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBe(controller.signal)
  })

  it('normalizes the project error envelope', async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        {
          details: [{ field: 'email', message: 'Ungültige E-Mail-Adresse.' }],
          error_code: 'VALIDATION_ERROR',
          message: 'Die Anfrage enthält ungültige Daten.',
        },
        { status: 422, statusText: 'Unprocessable Entity' },
      ),
    )

    const error = await captureApiError(() => apiFetch('/auth/register'))

    expect(error).toMatchObject({
      details: [{ field: 'email', message: 'Ungültige E-Mail-Adresse.' }],
      errorCode: 'VALIDATION_ERROR',
      message: 'Die Anfrage enthält ungültige Daten.',
      status: 422,
      statusText: 'Unprocessable Entity',
    })
  })

  it('normalizes native FastAPI validation details', async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        {
          detail: [
            {
              loc: ['body', 'profile', 'first_name'],
              msg: 'Field required',
              type: 'missing',
            },
          ],
        },
        { status: 422 },
      ),
    )

    const error = await captureApiError(() => apiFetch('/users'))

    expect(error.details).toEqual([
      { field: 'profile.first_name', message: 'Field required' },
    ])
  })

  it('wraps network failures but preserves abort errors', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await expect(apiFetch('/health')).rejects.toMatchObject({
      errorCode: 'NETWORK_ERROR',
      status: 0,
    })

    const abortError = new DOMException('Aborted', 'AbortError')
    fetchMock.mockRejectedValueOnce(abortError)

    await expect(apiFetch('/health')).rejects.toBe(abortError)
  })
})

async function captureApiError(action: () => Promise<unknown>) {
  try {
    await action()
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError)
    return error as ApiError
  }

  throw new Error('Expected the request to fail with an ApiError.')
}
