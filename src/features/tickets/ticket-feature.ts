import { ClipboardList } from 'lucide-react'

import { defineFeatureModule } from '@/app/feature-module'

/** Registers the role-scoped authority ticket workspace and its read routes. */
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
