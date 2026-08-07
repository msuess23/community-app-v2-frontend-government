import { ClipboardList } from 'lucide-react'

import { defineFeatureModule } from '@/app/feature-module'

/** Registers the complete role-scoped authority workspace for event-sourced tickets. */
export const ticketFeature = defineFeatureModule({
  capability: 'viewTicketWorkspace',
  id: 'tickets',
  navigation: [
    {
      icon: ClipboardList,
      label: 'Tickets',
      to: '/tickets',
    },
  ],
  routes: [
    {
      handle: { pageTitle: 'Tickets' },
      lazy: async () => {
        const { TicketDirectoryPage } = await import(
          '@/features/tickets/pages/TicketDirectoryPage'
        )
        return { Component: TicketDirectoryPage }
      },
      path: 'tickets',
    },
    {
      handle: { pageTitle: 'Ticketdetails' },
      lazy: async () => {
        const { TicketDetailPage } = await import(
          '@/features/tickets/pages/TicketDetailPage'
        )
        return { Component: TicketDetailPage }
      },
      path: 'tickets/:ticketId',
    },
  ],
})
