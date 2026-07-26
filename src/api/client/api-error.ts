export type ApiFieldError = {
  field?: string
  message: string
}

type ApiErrorOptions<TBody> = {
  body?: TBody
  cause?: unknown
  details?: ApiFieldError[]
  errorCode?: string
  message: string
  status: number
  statusText?: string
}

type UnknownRecord = Record<string, unknown>

const LOCATION_PREFIXES = new Set(['body', 'cookie', 'header', 'path', 'query'])

export class ApiError<TBody = unknown> extends Error {
  readonly body?: TBody
  readonly details: ApiFieldError[]
  readonly errorCode?: string
  readonly status: number
  readonly statusText: string

  constructor({
    body,
    cause,
    details = [],
    errorCode,
    message,
    status,
    statusText = '',
  }: ApiErrorOptions<TBody>) {
    super(message, { cause })
    this.name = 'ApiError'
    this.body = body
    this.details = details
    this.errorCode = errorCode
    this.status = status
    this.statusText = statusText
  }
}

export function createHttpApiError(
  response: Response,
  body: unknown,
): ApiError {
  const normalized = normalizeErrorBody(body)

  return new ApiError({
    body,
    details: normalized.details,
    errorCode: normalized.errorCode,
    message:
      normalized.message ??
      `Die Anfrage ist mit HTTP-Status ${response.status} fehlgeschlagen.`,
    status: response.status,
    statusText: response.statusText,
  })
}

export function createNetworkApiError(cause: unknown): ApiError {
  return new ApiError({
    cause,
    errorCode: 'NETWORK_ERROR',
    message: 'Der Server konnte nicht erreicht werden.',
    status: 0,
  })
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

function normalizeErrorBody(body: unknown): {
  details: ApiFieldError[]
  errorCode?: string
  message?: string
} {
  if (typeof body === 'string' && body.trim()) {
    return { details: [], message: body.trim() }
  }

  if (!isRecord(body)) {
    return { details: [] }
  }

  const errorCode = readString(body.error_code) ?? readString(body.errorCode)
  const message = readString(body.message)

  if (Array.isArray(body.details)) {
    return {
      details: normalizeDetails(body.details),
      errorCode,
      message,
    }
  }

  if (typeof body.detail === 'string') {
    return {
      details: [],
      errorCode,
      message: message ?? body.detail,
    }
  }

  if (Array.isArray(body.detail)) {
    const details = normalizeDetails(body.detail)

    return {
      details,
      errorCode,
      message: message ?? details[0]?.message,
    }
  }

  return { details: [], errorCode, message }
}

function normalizeDetails(details: unknown[]): ApiFieldError[] {
  return details.flatMap((detail) => {
    if (!isRecord(detail)) {
      return []
    }

    const message = readString(detail.message) ?? readString(detail.msg)

    if (!message) {
      return []
    }

    const field = readString(detail.field) ?? normalizeLocation(detail.loc)

    return [{ field, message }]
  })
}

function normalizeLocation(location: unknown): string | undefined {
  if (!Array.isArray(location)) {
    return undefined
  }

  const segments = location
    .filter((segment): segment is string | number =>
      ['string', 'number'].includes(typeof segment),
    )
    .map(String)

  if (segments.length > 0 && LOCATION_PREFIXES.has(segments[0])) {
    segments.shift()
  }

  return segments.length > 0 ? segments.join('.') : undefined
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}
