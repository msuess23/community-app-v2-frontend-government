import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'

import { useConfirmation } from '@/shared/confirmation/confirmation-context'
import { Button } from '@/shared/ui/Button'
import { renderWithProviders } from '@/test/render'

/** Exposes one destructive confirmation and renders its resolved decision. */
function ConfirmationHarness() {
  const { confirm } = useConfirmation()
  const [result, setResult] = useState('Noch nicht entschieden')

  /** Requests the decision and stores the result for an observable assertion. */
  async function requestDeletion(): Promise<void> {
    const accepted = await confirm({
      confirmLabel: 'Eintrag löschen',
      description:
        'Der Eintrag kann anschließend nicht wiederhergestellt werden.',
      title: 'Eintrag wirklich löschen?',
      tone: 'danger',
    })

    setResult(accepted ? 'Bestätigt' : 'Abgebrochen')
  }

  return (
    <div>
      <Button onPress={() => void requestDeletion()}>Löschen</Button>
      <p>{result}</p>
    </div>
  )
}

/** Exposes two simultaneous requests to verify serialized modal decisions. */
function QueuedConfirmationHarness() {
  const { confirm } = useConfirmation()
  const [result, setResult] = useState('Noch nicht entschieden')

  /** Queues two decisions before waiting for their ordered results. */
  async function requestSequence(): Promise<void> {
    const firstDecision = confirm({
      description: 'Die erste Entscheidung wird zuerst angezeigt.',
      title: 'Erste Entscheidung',
    })
    const secondDecision = confirm({
      description: 'Die zweite Entscheidung folgt nach der ersten.',
      title: 'Zweite Entscheidung',
    })
    const decisions = await Promise.all([firstDecision, secondDecision])

    setResult(decisions.join(','))
  }

  return (
    <div>
      <Button onPress={() => void requestSequence()}>Entscheidungen öffnen</Button>
      <p>{result}</p>
    </div>
  )
}

describe('ConfirmationProvider', () => {
  it('focuses the safe action, resolves acceptance and restores trigger focus', async () => {
    const user = userEvent.setup()

    renderWithProviders(<ConfirmationHarness />)

    const trigger = screen.getByRole('button', { name: 'Löschen' })
    await user.click(trigger)

    expect(
      screen.getByRole('heading', { name: 'Eintrag wirklich löschen?' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Abbrechen' })).toHaveFocus()

    await user.click(screen.getByRole('button', { name: 'Eintrag löschen' }))

    expect(await screen.findByText('Bestätigt')).toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('cancels with Escape and restores the originating focus', async () => {
    const user = userEvent.setup()

    renderWithProviders(<ConfirmationHarness />)

    const trigger = screen.getByRole('button', { name: 'Löschen' })
    await user.click(trigger)
    await user.keyboard('{Escape}')

    expect(await screen.findByText('Abgebrochen')).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Eintrag wirklich löschen?' }),
    ).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('serializes queued requests and restores focus after the final decision', async () => {
    const user = userEvent.setup()

    renderWithProviders(<QueuedConfirmationHarness />)

    const trigger = screen.getByRole('button', {
      name: 'Entscheidungen öffnen',
    })
    await user.click(trigger)

    expect(
      screen.getByRole('heading', { name: 'Erste Entscheidung' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Bestätigen' }))

    expect(
      await screen.findByRole('heading', { name: 'Zweite Entscheidung' }),
    ).toBeInTheDocument()
    expect(trigger).not.toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'Abbrechen' }))

    expect(await screen.findByText('true,false')).toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
})
