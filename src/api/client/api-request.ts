import {
  ApiError,
  createHttpApiError,
  createNetworkApiError,
} from '@/api/client/api-error'
import { resolveApiUrl } from '@/api/client/api-url'
import { isAbortError } from '@/api/client/request-error'

export type ApiResponseType =
  | 'arrayBuffer'
  | 'arraybuffer'
  | 'blob'
  | 'json'
  | 'text'

export type ApiRequestOptions = RequestInit & {
  responseType?: ApiResponseType
}

export type ApiRequestExecutor = (
  url: string,
  options?: ApiRequestOptions,
) => Promise<unknown>

export type BodyType<BodyData> = BodyData
export type ErrorType<ErrorBody> = ApiError<ErrorBody>

export async function executeApiRequest<T>(
  url: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { responseType, ...requestInit } = options
  const headers = new Headers(requestInit.headers)

  if (isFormData(requestInit.body)) {
    headers.delete('Content-Type')
  }

  let response: Response

  try {
    response = await fetch(resolveApiUrl(url), {
      ...requestInit,
      headers,
    })
  } catch (error) {
    if (isAbortError(error)) {
      throw error
    }

    throw createNetworkApiError(error)
  }

  if (!response.ok) {
    throw createHttpApiError(response, await readErrorBody(response))
  }

  return readSuccessBody<T>(response, responseType)
}

async function readSuccessBody<T>(
  response: Response,
  responseType?: ApiResponseType,
): Promise<T> {
  if ([204, 205, 304].includes(response.status) || response.body === null) {
    return undefined as T
  }

  switch (responseType) {
    case 'arrayBuffer':
    case 'arraybuffer':
      return (await response.arrayBuffer()) as T
    case 'blob':
      return (await response.blob()) as T
    case 'json':
      return (await response.json()) as T
    case 'text':
      return (await response.text()) as T
  }

  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''

  if (isJsonContentType(contentType)) {
    return (await response.json()) as T
  }

  if (contentType.startsWith('text/') || contentType.includes('xml')) {
    return (await response.text()) as T
  }

  if (contentType) {
    return (await response.blob()) as T
  }

  const text = await response.text()

  return (text ? text : undefined) as T
}

async function readErrorBody(response: Response): Promise<unknown> {
  if (response.body === null) {
    return undefined
  }

  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''

  if (isJsonContentType(contentType)) {
    try {
      return await response.json()
    } catch {
      return undefined
    }
  }

  try {
    const text = await response.text()
    return text || undefined
  } catch {
    return undefined
  }
}

function isJsonContentType(contentType: string): boolean {
  return (
    contentType.includes('application/json') || contentType.includes('+json')
  )
}

function isFormData(body: BodyInit | null | undefined): body is FormData {
  return typeof FormData !== 'undefined' && body instanceof FormData
}
