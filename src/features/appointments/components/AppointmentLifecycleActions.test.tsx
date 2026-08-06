import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { AppointmentLifecycleActions } from '@/features/appointments/components/AppointmentLifecycleActions'
import { ALL_APPOINTMENT_ACTIONS } from '@/features/appointments/model/appointment-lifecycle'
import type { AppointmentRecord } from '@/features/appointments/model/appointment-model'
import { renderWithProviders } from '@/test/render'

describe('AppointmentLifecycleActions', () => {
  it('registers every action exposed by the backend appointment contract', () => {
    renderWithProviders(
      <AppointmentLifecycleActions
        appointment={createAppointment(ALL_APPOINTMENT_ACTIONS)}
      />,
    )

    for (const label of [
      'Verschieben',
      'Stornieren',
      'Abschließen',
      'Nicht erschienen',
    ]) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
  })

  it('guards edited forms and restores focus after an explicit discard', async () => {
    const user = userEvent.setup()

    renderWithProviders(
      <AppointmentLifecycleActions
        appointment={createAppointment(['CANCEL'])}
      />,
    )

    const trigger = screen.getByRole('button', { name: 'Stornieren' })
    await user.click(trigger)
    await user.type(
      screen.getByLabelText('Stornierungsbegründung'),
      'Bürger sagt ab',
    )
    await user.click(
      screen.getByRole('button', { name: 'Aktionsdialog schließen' }),
    )

    expect(
      screen.getByRole('dialog', { name: 'Terminaktion abbrechen?' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Abbrechen' }))
    expect(
      screen.getByRole('dialog', { name: 'Termin stornieren' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Stornierungsbegründung')).toHaveValue(
      'Bürger sagt ab',
    )

    await user.click(
      screen.getByRole('button', { name: 'Aktionsdialog schließen' }),
    )
    await user.click(
      screen.getByRole('button', { name: 'Eingaben verwerfen' }),
    )

    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: 'Termin stornieren' }),
      ).not.toBeInTheDocument()
    })
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('does not infer local actions when the backend permits none', () => {
    renderWithProviders(
      <AppointmentLifecycleActions appointment={createAppointment([])} />,
    )

    expect(
      screen.getByText(
        'Für diesen Terminstand sind keine weiteren Aktionen verfügbar.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

function createAppointment(
  allowedActions: AppointmentRecord['allowedActions'],
): AppointmentRecord {
  return {
    allowedActions,
    cancelledAt: null,
    citizen: { displayName: 'Clara Bürgerin', id: 'citizen-1' },
    completedAt: null,
    createdAt: '2026-08-01T08:00:00Z',
    currentSlotId: 'slot-1',
    endsAt: '2099-08-12T09:30:00Z',
    id: 'appointment-1',
    office: { id: 'office-1', name: 'Bürgeramt Mitte' },
    reason: 'Ummeldung',
    startsAt: '2099-08-12T09:00:00Z',
    status: 'SCHEDULED',
    ticket: null,
    updatedAt: '2026-08-02T08:00:00Z',
    version: 1,
  }
}
