export type QueryParameters = object
export type ResourceIdentifier = number | string

/** Removes omitted values so equivalent filters share the same cache entry. */
export function compactQueryParameters<TParameters extends QueryParameters>(
  parameters: TParameters,
): Partial<TParameters> {
  return Object.fromEntries(
    Object.entries(parameters).filter(([, value]) => value !== undefined),
  ) as Partial<TParameters>
}

/** Creates predictable list, detail and related-resource keys for one feature. */
export function createResourceQueryKeys<
  TListParameters extends QueryParameters = QueryParameters,
  TIdentifier extends ResourceIdentifier = string,
>(scope: string) {
  const normalizedScope = scope.trim()

  if (!normalizedScope) {
    throw new Error('A query key scope must not be empty.')
  }

  const root = ['resource', normalizedScope] as const

  return {
    all: root,
    details: () => [...root, 'detail'] as const,
    detail: (identifier: TIdentifier) =>
      [...root, 'detail', identifier] as const,
    lists: () => [...root, 'list'] as const,
    list: (parameters: TListParameters) =>
      [...root, 'list', compactQueryParameters(parameters)] as const,
    related: <TRelatedParameters extends QueryParameters>(
      identifier: TIdentifier,
      relation: string,
      parameters?: TRelatedParameters,
    ) => {
      const normalizedRelation = relation.trim()

      if (!normalizedRelation) {
        throw new Error('A related query key segment must not be empty.')
      }

      const relatedRoot = [
        ...root,
        'detail',
        identifier,
        normalizedRelation,
      ] as const

      return parameters
        ? ([...relatedRoot, compactQueryParameters(parameters)] as const)
        : relatedRoot
    },
  }
}
