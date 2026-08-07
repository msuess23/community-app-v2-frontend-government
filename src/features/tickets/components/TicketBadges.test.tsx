import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  TicketCategoryBadge,
  TicketStatusBadge,
  TicketVisibilityBadge,
  TicketWorkflowStateBadge,
} from '@/features/tickets/components/TicketBadges'

describe('ticket badges', () => {
  it('keeps visible labels compact while adding screen-reader context', () => {
    render(
      <div>
        <TicketCategoryBadge category="INFRASTRUCTURE" />
        <TicketWorkflowStateBadge state="IN_PROGRESS" />
        <TicketStatusBadge status="IN_PROGRESS" />
        <TicketVisibilityBadge visibility="PUBLIC" />
      </div>,
    )

    expect(screen.getByText('Infrastruktur')).toBeVisible()
    expect(screen.getByText('Kategorie:')).toHaveClass('sr-only')
    expect(screen.getByText('Workflowzustand:')).toHaveClass('sr-only')
    expect(screen.getByText('Öffentlicher Status:')).toHaveClass('sr-only')
    expect(screen.getByText('Sichtbarkeit:')).toHaveClass('sr-only')
  })
})
