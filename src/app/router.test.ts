import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { appRoutes } from '@/app/router'
import { renderRouter } from '@/test/render'

describe('application routes', () => {
  it('renders the home page within the root layout', () => {
    renderRouter(appRoutes)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Behördenclient' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Zum Hauptinhalt springen' }),
    ).toHaveAttribute('href', '#main-content')
  })

  it('renders the shared UI kit', () => {
    renderRouter(appRoutes, ['/ui-kit'])

    expect(
      screen.getByRole('heading', { level: 1, name: 'UI-Bausteine' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Primär' }),
    ).toBeInTheDocument()
  })

  it('renders the not-found page for an unknown path', () => {
    renderRouter(appRoutes, ['/nicht-vorhanden'])

    expect(
      screen.getByRole('heading', { level: 1, name: 'Seite nicht gefunden' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Zur Startseite' }),
    ).toHaveAttribute('href', '/')
  })
})
