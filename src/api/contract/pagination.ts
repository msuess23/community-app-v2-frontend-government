import type { ApiResponseMapper } from '@/api/contract/mapper'

export type ApiPaginatedResponse<TDto> = Readonly<{
  data: readonly TDto[]
  page: number
  pages: number
  size: number
  total: number
}>

export type PageModel<TModel> = Readonly<{
  items: readonly TModel[]
  page: number
  pageCount: number
  pageSize: number
  totalItems: number
}>

/** Converts the backend's snake-case-neutral page envelope into the shared UI page model. */
export function mapApiPage<TDto, TModel>(
  response: ApiPaginatedResponse<TDto>,
  mapItem: ApiResponseMapper<TDto, TModel>,
): PageModel<TModel> {
  return {
    items: response.data.map(mapItem),
    page: response.page,
    pageCount: response.pages,
    pageSize: response.size,
    totalItems: response.total,
  }
}
