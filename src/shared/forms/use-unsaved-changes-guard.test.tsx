import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { Link, useNavigate, type RouteObject } from 'react-router'
import { describe, expect, it } from 'vitest'

import { useUnsavedChangesGuard } from '@/shared/forms/use-unsaved-changes-guard'
import { renderRouter } from '@/test/render'

const routes: RouteObject[] = [
  {
    path: '/',
    Component: DirtyForm,
  },
  {
    path: '/target',
    element: <h1>Zielseite</h1>,
  },
]

function DirtyForm() {
  const [value, setValue] = useState('')
  useUnsavedChangesGuard({ hasUnsavedChanges: value.length > 0 })

  return (
    <main>
      <label>
        Notiz
        <input
          onChange={(event) => setValue(event.target.value)}
          value={value}
        />
      </label>
      <Link to="/target">Zur Zielseite</Link>
    </main>
  )
}

function SuccessfullySavedForm() {
  const navigate = useNavigate()
  const { allowNextNavigation } = useUnsavedChangesGuard({
    hasUnsavedChanges: true,
  })

  return (
    <main>
      <button
        onClick={() => {
          allowNextNavigation()
          navigate('/target')
        }}
        type="button"
      >
        Speichern und verlassen
      </button>
    </main>
  )
}

describe('useUnsavedChangesGuard', () => {
  it('keeps the user on the form when navigation is cancelled', async () => {
    const user = userEvent.setup()
    const rendered = renderRouter(routes)

    await user.type(screen.getByRole('textbox', { name: 'Notiz' }), 'Entwurf')
    await user.click(screen.getByRole('link', { name: 'Zur Zielseite' }))

    screen.getByRole('dialog', {
      name: 'Ungespeicherte Änderungen verwerfen?',
    })
    await user.click(screen.getByRole('button', { name: 'Weiter bearbeiten' }))

    expect(rendered.router.state.location.pathname).toBe('/')
    expect(screen.getByRole('textbox', { name: 'Notiz' })).toHaveValue(
      'Entwurf',
    )
    expect(
      screen.queryByRole('dialog', {
        name: 'Ungespeicherte Änderungen verwerfen?',
      }),
    ).not.toBeInTheDocument()
  })

  it('continues the blocked navigation after explicit confirmation', async () => {
    const user = userEvent.setup()
    const rendered = renderRouter(routes)

    await user.type(screen.getByRole('textbox', { name: 'Notiz' }), 'Entwurf')
    await user.click(screen.getByRole('link', { name: 'Zur Zielseite' }))
    await user.click(
      screen.getByRole('button', { name: 'Änderungen verwerfen' }),
    )

    expect(
      await screen.findByRole('heading', { name: 'Zielseite' }),
    ).toBeVisible()
    expect(rendered.router.state.location.pathname).toBe('/target')
  })

  it('allows the immediate navigation after a confirmed successful save', async () => {
    const user = userEvent.setup()
    const rendered = renderRouter([
      { path: '/', Component: SuccessfullySavedForm },
      { path: '/target', element: <h1>Zielseite</h1> },
    ])

    await user.click(
      screen.getByRole('button', { name: 'Speichern und verlassen' }),
    )

    expect(
      await screen.findByRole('heading', { name: 'Zielseite' }),
    ).toBeVisible()
    expect(rendered.router.state.location.pathname).toBe('/target')
    expect(
      screen.queryByRole('dialog', {
        name: 'Ungespeicherte Änderungen verwerfen?',
      }),
    ).not.toBeInTheDocument()
  })

  it('prevents browser-level exits while the form is dirty', async () => {
    const user = userEvent.setup()
    renderRouter(routes)

    await user.type(screen.getByRole('textbox', { name: 'Notiz' }), 'Entwurf')
    const event = new Event('beforeunload', { cancelable: true })

    window.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
  })
})
