import { createElement } from 'react'
import type { RouteObject } from 'react-router'

import type { AppNavigationItem } from '@/app/navigation-types'
import { RequireCapability } from '@/auth/RequireCapability'
import type { AppCapability } from '@/auth/capabilities'

export type FeatureNavigationItem = Omit<AppNavigationItem, 'capability'>

export type AppFeatureModule = Readonly<{
  capability: AppCapability
  id: string
  navigation?: readonly FeatureNavigationItem[]
  routes: readonly RouteObject[]
}>

export type AppFeatureRegistry = Readonly<{
  modules: readonly AppFeatureModule[]
  navigation: readonly AppNavigationItem[]
  routes: readonly RouteObject[]
}>

/** Preserves literal feature metadata while checking it against the shared module contract. */
export function defineFeatureModule<TModule extends AppFeatureModule>(
  module: TModule,
): TModule {
  return module
}

/** Combines independently owned feature routes and navigation into one validated registry. */
export function createFeatureRegistry(
  modules: readonly AppFeatureModule[],
): AppFeatureRegistry {
  assertUniqueValues(
    modules.map((module) => module.id),
    'feature module id',
  )

  modules.forEach(assertValidFeatureModule)

  const routes = modules.map((module) => ({
    children: [...module.routes],
    element: createElement(RequireCapability, {
      capability: module.capability,
    }),
  }))
  const navigation = modules.flatMap((module) =>
    (module.navigation ?? []).map((item) => ({
      ...item,
      capability: module.capability,
    })),
  )

  assertUniqueValues(
    navigation.map((item) => item.to),
    'feature navigation target',
  )

  return Object.freeze({
    modules: Object.freeze([...modules]),
    navigation: Object.freeze(navigation),
    routes: Object.freeze(routes),
  })
}

/** Validates one module before it contributes protected application routes. */
function assertValidFeatureModule(module: AppFeatureModule): void {
  if (module.routes.length === 0) {
    throw new Error(
      `Feature module "${module.id}" must register at least one route.`,
    )
  }

  module.routes.forEach((route) => {
    if (route.path?.startsWith('/')) {
      throw new Error(
        `Feature route "${route.path}" must be relative to the authenticated App-Shell.`,
      )
    }
  })

  module.navigation?.forEach((item) => {
    if (!item.to.startsWith('/') || item.to.startsWith('//')) {
      throw new Error(
        `Feature navigation target "${item.to}" must be an internal absolute path.`,
      )
    }
  })
}

/** Fails early when independently developed modules would register ambiguous identifiers. */
function assertUniqueValues(values: readonly string[], label: string): void {
  const seen = new Set<string>()

  values.forEach((value) => {
    if (seen.has(value)) {
      throw new Error(`Duplicate ${label}: "${value}".`)
    }

    seen.add(value)
  })
}
