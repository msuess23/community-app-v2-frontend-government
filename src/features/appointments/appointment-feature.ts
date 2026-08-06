import { CalendarDays } from 'lucide-react'

import { defineFeatureModule } from '@/app/feature-module'

/** Registers the role-scoped read-only appointment workspace for authority staff. */
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
