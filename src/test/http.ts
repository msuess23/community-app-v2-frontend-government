import { HttpResponse } from 'msw'

export type MockApiErrorOptions = Readonly<{
  details?: ReadonlyArray<Readonly<{ field?: string; message: string }>>
  errorCode?: string
  message: string
  status: number
}>

/** Creates the same stable JSON error envelope returned by the backend. */
export function mockApiError({
  details = [],
  errorCode,
  message,
  status,
}: MockApiErrorOptions) {
  return HttpResponse.json(
    {
      details,
      ...(errorCode ? { error_code: errorCode } : {}),
      message,
    },
    { status },
  )
}
