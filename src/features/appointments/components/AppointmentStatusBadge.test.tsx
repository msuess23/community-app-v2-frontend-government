import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AppointmentStatusBadge } from '@/features/appointments/components/AppointmentStatusBadge'

describe('AppointmentStatusBadge', () => {
  it('exposes a complete screen-reader status label', () => {
    render(<AppointmentStatusBadge status="NO_SHOW" />)
    expect(screen.getByText('Nicht erschienen')).toBeVisible()
    expect(screen.getByText('Terminstatus:')).toHaveClass('sr-only')
  })
})
