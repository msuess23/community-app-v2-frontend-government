import { createFeatureRegistry } from '@/app/feature-module'

// Concrete feature modules are added here only when their routes are usable.
const featureRegistry = createFeatureRegistry([])

export const FEATURE_MODULES = featureRegistry.modules
export const FEATURE_NAVIGATION_ITEMS = featureRegistry.navigation
export const FEATURE_ROUTES = featureRegistry.routes
