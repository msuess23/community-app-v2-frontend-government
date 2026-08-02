import { createContext, useContext, useEffect } from 'react'

import type { ResourceActionCloseGuard } from '@/shared/resource-detail/resource-action-registry'

export type ResourceActionDialogContextValue = Readonly<{
  close: () => void
  registerCloseGuard: (guard: ResourceActionCloseGuard | null) => void
}>

export const ResourceActionDialogContext =
  createContext<ResourceActionDialogContextValue | null>(null)

/** Exposes the active shared action dialog to feature-owned action content. */
export function useResourceActionDialog(): Pick<
  ResourceActionDialogContextValue,
  'close'
> {
  const context = useContext(ResourceActionDialogContext)

  if (!context) {
    throw new Error(
      'useResourceActionDialog must be used inside a resource action dialog.',
    )
  }

  return { close: context.close }
}

/** Registers a dirty-form guard for the lifetime of one action content component. */
export function useResourceActionCloseGuard(
  guard: ResourceActionCloseGuard | null,
): void {
  const context = useContext(ResourceActionDialogContext)

  if (!context) {
    throw new Error(
      'useResourceActionCloseGuard must be used inside a resource action dialog.',
    )
  }

  useEffect(() => {
    context.registerCloseGuard(guard)
    return () => context.registerCloseGuard(null)
  }, [context, guard])
}
