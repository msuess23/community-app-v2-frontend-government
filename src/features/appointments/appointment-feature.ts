import { createElement } from 'react'
import { CalendarDays } from 'lucide-react'

import { defineFeatureModule } from '@/app/feature-module'
import { RequireCapability } from '@/auth/RequireCapability'

/** Registers the role-scoped appointment workspace for authority staff. */
export const appointmentFeature = defineFeatureModule({
  capability: 'viewAppointmentWorkspace',
  id: 'appointments',
  navigation: [
    {
      icon: CalendarDays,
      label: 'Termine',
      to: '/appointments',
    },
  ],
  routes: [
    {
      handle: { pageTitle: 'Termine' },
      lazy: async () => {
        const { AppointmentDirectoryPage } = await import(
          '@/features/appointments/pages/AppointmentDirectoryPage'
        )
        return { Component: AppointmentDirectoryPage }
      },
      path: 'appointments',
    },
    {
      children: [
        {
          handle: { pageTitle: 'Terminslots' },
          lazy: async () => {
            const { AppointmentSlotDirectoryPage } = await import(
              '@/features/appointments/pages/AppointmentSlotDirectoryPage'
            )
            return { Component: AppointmentSlotDirectoryPage }
          },
          path: 'appointments/slots',
        },
        {
          handle: { pageTitle: 'Terminslots anlegen' },
          lazy: async () => {
            const { AppointmentSlotCreatePage } = await import(
              '@/features/appointments/pages/AppointmentSlotCreatePage'
            )
            return { Component: AppointmentSlotCreatePage }
          },
          path: 'appointments/slots/new',
        },
      ],
      element: createElement(RequireCapability, {
        capability: 'manageAppointmentSlots',
      }),
    },
    {
      handle: { pageTitle: 'Termindetails' },
      lazy: async () => {
        const { AppointmentDetailPage } = await import(
          '@/features/appointments/pages/AppointmentDetailPage'
        )
        return { Component: AppointmentDetailPage }
      },
      path: 'appointments/:appointmentId',
    },
  ],
})
