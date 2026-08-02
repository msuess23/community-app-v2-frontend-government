export type ApiResponseMapper<TDto, TModel> = (dto: TDto) => TModel
export type ApiRequestMapper<TModel, TDto> = (model: TModel) => TDto

/** Maps an optional transport value without collapsing undefined and null. */
export function mapOptional<TDto, TModel>(
  value: TDto | undefined,
  mapper: ApiResponseMapper<TDto, TModel>,
): TModel | undefined {
  return value === undefined ? undefined : mapper(value)
}

/** Maps a nullable transport value while preserving an explicit backend null. */
export function mapNullable<TDto, TModel>(
  value: TDto | null,
  mapper: ApiResponseMapper<TDto, TModel>,
): TModel | null {
  return value === null ? null : mapper(value)
}
