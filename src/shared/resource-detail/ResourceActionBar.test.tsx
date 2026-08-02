import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect, useMemo, useState } from 'react'
import { vi } from 'vitest'

import { ResourceActionBar } from '@/shared/resource-detail/ResourceActionBar'
import {
  createResourceActionRegistry,
  type ResourceActionCloseGuard,
} from '@/shared/resource-detail/resource-action-registry'
import { Button } from '@/shared/ui/Button'
import { renderWithProviders } from '@/test/render'

type Action = 'COMPLETE'

const registry = createResourceActionRegistry<Action>([
  {
    action: 'COMPLETE',
    description: 'Die Aktion aktualisiert anschließend die Serverprojektion.',
    dialogTitle: 'Anliegen abschließen',
    label: 'Abschließen',
    render: ({ close }) => (
      <div>
        <p>Aktionsinhalt</p>
        <Button onPress={close}>Fertig</Button>
      </div>
    ),
  },
])

describe('ResourceActionBar', () => {
  it('renders only registered server actions and restores trigger focus', async () => {
    const user = userEvent.setup()
    const onUnknownActions = vi.fn()

    renderWithProviders(
      <ResourceActionBar
        allowedActions={['COMPLETE', 'NEW_BACKEND_ACTION']}
        onUnknownActions={onUnknownActions}
        registry={registry}
      />,
    )

    await waitFor(() => {
      expect(onUnknownActions).toHaveBeenCalledWith(['NEW_BACKEND_ACTION'])
    })
    expect(
      screen.queryByRole('button', { name: 'NEW_BACKEND_ACTION' }),
    ).not.toBeInTheDocument()

    const trigger = screen.getByRole('button', { name: 'Abschließen' })
    await user.click(trigger)

    expect(
      screen.getByRole('heading', { name: 'Anliegen abschließen' }),
    ).toBeInTheDocument()
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Aktionsdialog schließen' }),
      ).toHaveFocus()
    })

    await user.click(screen.getByRole('button', { name: 'Fertig' }))

    expect(
      screen.queryByRole('heading', { name: 'Anliegen abschließen' }),
    ).not.toBeInTheDocument()
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('replaces a withdrawn workflow with a stale-state notice', async () => {
    const user = userEvent.setup()

    renderWithProviders(<WithdrawnActionHarness />)

    await user.click(screen.getByRole('button', { name: 'Abschließen' }))
    await user.click(
      screen.getByRole('button', { name: 'Serverstand aktualisieren' }),
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Aktion nicht mehr verfügbar',
    )
    expect(screen.queryByText('Aktionsinhalt')).not.toBeInTheDocument()
  })

  it('honors a feature close guard before dismissing edited action content', async () => {
    const user = userEvent.setup()
    const guardedRegistry = createResourceActionRegistry<Action>([
      {
        action: 'COMPLETE',
        dialogTitle: 'Geschützte Aktion',
        label: 'Öffnen',
        render: ({ registerCloseGuard }) => (
          <GuardedActionContent registerCloseGuard={registerCloseGuard} />
        ),
      },
    ])

    renderWithProviders(
      <ResourceActionBar
        allowedActions={['COMPLETE']}
        registry={guardedRegistry}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Öffnen' }))
    await user.keyboard('{Escape}')

    expect(
      screen.getByRole('heading', { name: 'Geschützte Aktion' }),
    ).toBeInTheDocument()
  })

  it('closes the action workflow with Escape', async () => {
    const user = userEvent.setup()

    renderWithProviders(
      <ResourceActionBar allowedActions={['COMPLETE']} registry={registry} />,
    )

    const trigger = screen.getByRole('button', { name: 'Abschließen' })
    await user.click(trigger)
    await user.keyboard('{Escape}')

    expect(
      screen.queryByRole('heading', { name: 'Anliegen abschließen' }),
    ).not.toBeInTheDocument()
    await waitFor(() => expect(trigger).toHaveFocus())
  })
})

interface GuardedActionContentProps {
  registerCloseGuard: (guard: ResourceActionCloseGuard | null) => void
}

/** Registers the edited-form guard after the action content has mounted. */
function GuardedActionContent({
  registerCloseGuard,
}: GuardedActionContentProps) {
  useEffect(() => {
    registerCloseGuard(() => false)
    return () => registerCloseGuard(null)
  }, [registerCloseGuard])

  return <p>Ungespeicherte Aktionsdaten</p>
}

/** Simulates a refetch that removes an action while its workflow is open. */
function WithdrawnActionHarness() {
  const [allowedActions, setAllowedActions] = useState<ReadonlyArray<string>>([
    'COMPLETE',
  ])
  const actionRegistry = useMemo(
    () =>
      createResourceActionRegistry<Action>([
        {
          action: 'COMPLETE',
          dialogTitle: 'Anliegen abschließen',
          label: 'Abschließen',
          render: () => (
            <div>
              <p>Aktionsinhalt</p>
              <Button onPress={() => setAllowedActions([])}>
                Serverstand aktualisieren
              </Button>
            </div>
          ),
        },
      ]),
    [],
  )

  return (
    <ResourceActionBar
      allowedActions={allowedActions}
      registry={actionRegistry}
    />
  )
}
