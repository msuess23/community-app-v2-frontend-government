import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { useFeedback } from '@/shared/feedback/feedback-context'
import { Button } from '@/shared/ui/Button'
import { renderWithProviders } from '@/test/render'

/** Exposes representative notification actions for provider integration tests. */
function FeedbackHarness() {
  const { notify } = useFeedback()

  return (
    <div>
      <Button
        onPress={() =>
          notify({
            description: 'Die Änderungen wurden übernommen.',
            title: 'Gespeichert',
            tone: 'success',
          })
        }
      >
        Erfolg anzeigen
      </Button>
      <Button
        onPress={() =>
          notify({
            dedupeKey: 'save-failed',
            description: 'Die Aktion konnte nicht abgeschlossen werden.',
            title: 'Speichern fehlgeschlagen',
            tone: 'error',
          })
        }
      >
        Fehler anzeigen
      </Button>
    </div>
  )
}

describe('FeedbackProvider', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('announces and automatically dismisses non-critical feedback', async () => {
    vi.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    renderWithProviders(<FeedbackHarness />)

    await user.click(screen.getByRole('button', { name: 'Erfolg anzeigen' }))

    expect(screen.getByRole('status')).toHaveTextContent('Gespeichert')

    act(() => {
      vi.advanceTimersByTime(6_000)
    })

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('keeps critical feedback visible, deduplicates it and allows dismissal', async () => {
    const user = userEvent.setup()

    renderWithProviders(<FeedbackHarness />)

    const trigger = screen.getByRole('button', { name: 'Fehler anzeigen' })
    await user.click(trigger)
    await user.click(trigger)

    expect(screen.getAllByRole('alert')).toHaveLength(1)

    await user.click(
      screen.getByRole('button', {
        name: 'Benachrichtigung „Speichern fehlgeschlagen“ schließen',
      }),
    )

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
