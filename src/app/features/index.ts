import { createFeatureRegistry } from '@/app/feature-module'
import { appointmentFeature } from '@/features/appointments/appointment-feature'
import { infoFeature } from '@/features/infos/info-feature'
import { officeFeature } from '@/features/offices/office-feature'
import { ticketFeature } from '@/features/tickets/ticket-feature'
import { userFeature } from '@/features/users/user-feature'

// Concrete feature modules are added here only when their routes are usable.
const featureRegistry = createFeatureRegistry([
  appointmentFeature,
  ticketFeature,
  userFeature,
  officeFeature,
  infoFeature,
])

export const FEATURE_MODULES = featureRegistry.modules
export const FEATURE_NAVIGATION_ITEMS = featureRegistry.navigation
export const FEATURE_ROUTES = featureRegistry.routes
