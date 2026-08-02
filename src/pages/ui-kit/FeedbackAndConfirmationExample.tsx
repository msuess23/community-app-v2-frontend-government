import { Bell, Trash2 } from 'lucide-react'

import { useConfirmation } from '@/shared/confirmation/confirmation-context'
import { useFeedback } from '@/shared/feedback/feedback-context'
import { Button } from '@/shared/ui/Button'

/** Demonstrates global feedback and a destructive confirmation in the development UI kit. */
export function FeedbackAndConfirmationExample() {
  const { confirm } = useConfirmation()
  const { notify } = useFeedback()

  /** Shows a transient success notification without changing application data. */
  function showSuccessFeedback(): void {
    notify({
      description:
        'Die Meldung verschwindet automatisch und kann vorher geschlossen werden.',
      title: 'Änderungen gespeichert',
      tone: 'success',
    })
  }

  /** Demonstrates the safe default focus and result handling of a destructive decision. */
  async function requestDestructiveConfirmation(): Promise<void> {
    const accepted = await confirm({
      confirmLabel: 'Beispiel löschen',
      description:
        'Diese Aktion verändert im UI-Kit keine Daten. Sie demonstriert lediglich den globalen Bestätigungsdialog.',
      title: 'Beispiel wirklich löschen?',
      tone: 'danger',
    })

    notify(
      accepted
        ? {
            description: 'Die beispielhafte Aktion wurde bestätigt.',
            title: 'Bestätigung erteilt',
            tone: 'success',
          }
        : {
            description: 'Es wurden keine Änderungen vorgenommen.',
            title: 'Aktion abgebrochen',
            tone: 'info',
          },
    )
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <Button onPress={showSuccessFeedback} variant="tertiary">
        <Bell aria-hidden="true" size={18} />
        Erfolgsmeldung anzeigen
      </Button>
      <Button
        onPress={() => void requestDestructiveConfirmation()}
        variant="danger"
      >
        <Trash2 aria-hidden="true" size={18} />
        Bestätigung öffnen
      </Button>
    </div>
  )
}
