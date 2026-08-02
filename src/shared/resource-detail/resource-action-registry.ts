import type { ReactNode } from 'react'

import type { ButtonVariant } from '@/shared/ui/button-styles'

export type ResourceActionCloseGuard = () => boolean | Promise<boolean>

export type ResourceActionRenderContext<TAction extends string> = Readonly<{
  action: TAction
  close: () => void
  registerCloseGuard: (guard: ResourceActionCloseGuard | null) => void
}>

export type ResourceActionDefinition<TAction extends string> = Readonly<{
  action: TAction
  buttonVariant?: ButtonVariant
  description?: ReactNode
  dialogTitle: ReactNode
  icon?: ReactNode
  label: string
  render: (context: ResourceActionRenderContext<TAction>) => ReactNode
}>

export type ResourceActionRegistry<TAction extends string> = ReadonlyMap<
  TAction,
  ResourceActionDefinition<TAction>
>

export type ResolvedResourceActions<TAction extends string> = Readonly<{
  actions: ReadonlyArray<ResourceActionDefinition<TAction>>
  unknownActions: ReadonlyArray<string>
}>

/** Builds an immutable action registry and rejects ambiguous duplicate keys early. */
export function createResourceActionRegistry<TAction extends string>(
  definitions: ReadonlyArray<ResourceActionDefinition<TAction>>,
): ResourceActionRegistry<TAction> {
  const registry = new Map<TAction, ResourceActionDefinition<TAction>>()

  for (const definition of definitions) {
    if (registry.has(definition.action)) {
      throw new Error(
        `Resource action "${definition.action}" is registered more than once.`,
      )
    }

    registry.set(definition.action, definition)
  }

  return registry
}

/** Resolves server-provided actions in server order while ignoring duplicates safely. */
export function resolveAllowedResourceActions<TAction extends string>(
  allowedActions: ReadonlyArray<string>,
  registry: ResourceActionRegistry<TAction>,
): ResolvedResourceActions<TAction> {
  const actions: ResourceActionDefinition<TAction>[] = []
  const unknownActions: string[] = []
  const seenActions = new Set<string>()

  for (const action of allowedActions) {
    if (seenActions.has(action)) {
      continue
    }

    seenActions.add(action)
    const definition = registry.get(action as TAction)

    if (definition) {
      actions.push(definition)
    } else {
      unknownActions.push(action)
    }
  }

  return { actions, unknownActions }
}
