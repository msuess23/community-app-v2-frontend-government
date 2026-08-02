import { ArrowRight, Check, Trash2 } from 'lucide-react'

import { FeedbackAndConfirmationExample } from '@/pages/ui-kit/FeedbackAndConfirmationExample'
import { LoginFormExample } from '@/pages/ui-kit/LoginFormExample'
import { Button } from '@/shared/ui/Button'
import { CheckboxField } from '@/shared/ui/CheckboxField'
import { Card } from '@/shared/ui/Card'
import { FormErrorSummary } from '@/shared/ui/FormErrorSummary'
import { LinkButton } from '@/shared/ui/LinkButton'
import { PageHeader } from '@/shared/ui/PageHeader'
import { TextField } from '@/shared/ui/TextField'

const colorTokens = [
  {
    className: 'bg-primary text-on-primary',
    label: 'Primär',
    value: '#00639C',
  },
  {
    className: 'bg-primary-container text-on-primary-container',
    label: 'Primär-Container',
    value: '#CCE5FF',
  },
  {
    className: 'bg-secondary text-on-secondary',
    label: 'Sekundär',
    value: '#536070',
  },
  {
    className: 'bg-secondary-container text-on-secondary-container',
    label: 'Sekundär-Container',
    value: '#D7E4F7',
  },
  {
    className: 'bg-tertiary text-on-tertiary',
    label: 'Tertiär',
    value: '#4C6648',
  },
  {
    className: 'bg-tertiary-container text-on-tertiary-container',
    label: 'Tertiär-Container',
    value: '#CEEBC5',
  },
  {
    className: 'bg-error text-on-error',
    label: 'Fehler',
    value: '#BA1A1A',
  },
  {
    className: 'bg-error-container text-on-error-container',
    label: 'Fehler-Container',
    value: '#FFDAD6',
  },
]

/** Presents development-only examples of the shared visual and interaction system. */
export function UiKitPage() {
  return (
    <div className="space-y-12">
      <PageHeader
        description={
          <p>
            Gemeinsame Komponenten und semantische Farben des Behördenclients.
            Die Palette orientiert sich am bisherigen Bürgerclient und wurde für
            zugängliche Textkontraste geprüft.
          </p>
        }
        eyebrow="Designsystem"
        title="UI-Bausteine"
      />

      <section aria-labelledby="colors-heading" className="space-y-5">
        <h2
          className="text-on-surface text-2xl font-semibold tracking-tight"
          id="colors-heading"
        >
          Farben
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {colorTokens.map((token) => (
            <div
              className={`min-h-32 rounded-xl p-5 ${token.className}`}
              key={token.label}
            >
              <p className="font-semibold">{token.label}</p>
              <p className="mt-1 font-mono text-sm">{token.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="buttons-heading" className="space-y-5">
        <h2
          className="text-on-surface text-2xl font-semibold tracking-tight"
          id="buttons-heading"
        >
          Aktionen
        </h2>
        <Card>
          <div className="flex flex-wrap gap-3">
            <Button>
              <Check aria-hidden="true" size={18} />
              Primär
            </Button>
            <Button variant="secondary">Sekundär</Button>
            <Button variant="tertiary">Tertiär</Button>
            <Button variant="outline">Kontur</Button>
            <Button variant="ghost">Dezent</Button>
            <Button variant="danger">
              <Trash2 aria-hidden="true" size={18} />
              Löschen
            </Button>
            <Button isDisabled>Deaktiviert</Button>
          </div>
        </Card>
      </section>

      <section aria-labelledby="feedback-heading" className="space-y-5">
        <h2
          className="text-on-surface text-2xl font-semibold tracking-tight"
          id="feedback-heading"
        >
          Rückmeldungen und Bestätigungen
        </h2>
        <Card>
          <p className="text-on-surface-variant mb-5 leading-7">
            Globale Rückmeldungen informieren über abgeschlossene oder
            fehlgeschlagene Aktionen. Bestätigungen sichern folgenreiche
            Entscheidungen ab.
          </p>
          <FeedbackAndConfirmationExample />
        </Card>
      </section>

      <section aria-labelledby="forms-heading" className="space-y-5">
        <h2
          className="text-on-surface text-2xl font-semibold tracking-tight"
          id="forms-heading"
        >
          Formulare
        </h2>
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <LoginFormExample />
          </Card>

          <Card variant="subtle">
            <div className="space-y-5">
              <FormErrorSummary
                errors={[
                  {
                    fieldId: 'ui-kit-invalid-email',
                    message: 'Die E-Mail-Adresse ist ungültig.',
                  },
                  {
                    message: 'Die Anmeldung konnte nicht abgeschlossen werden.',
                  },
                ]}
              />
              <TextField
                errorMessage="Bitte gib eine gültige E-Mail-Adresse ein."
                id="ui-kit-invalid-email"
                isInvalid
                label="E-Mail-Adresse"
                defaultValue="ungueltig"
              />
              <CheckboxField
                errorMessage="Die Zustimmung ist erforderlich."
                isInvalid
                label="Nutzungsbedingungen bestätigen"
              />
            </div>
          </Card>
        </div>
      </section>

      <section aria-labelledby="cards-heading" className="space-y-5">
        <h2
          className="text-on-surface text-2xl font-semibold tracking-tight"
          id="cards-heading"
        >
          Flächen
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <h3 className="font-semibold">Standardkarte</h3>
            <p className="text-on-surface-variant mt-2 leading-7">
              Für zentrale Inhalte mit dezenter Abgrenzung und leichter
              Erhöhung.
            </p>
          </Card>
          <Card variant="subtle">
            <h3 className="font-semibold">Dezente Fläche</h3>
            <p className="text-on-surface-variant mt-2 leading-7">
              Für zusammengehörige Informationen ohne zusätzliche Erhöhung.
            </p>
          </Card>
          <Card variant="outlined">
            <h3 className="font-semibold">Konturkarte</h3>
            <p className="text-on-surface-variant mt-2 leading-7">
              Für klar abgegrenzte Inhalte auf einer hellen Oberfläche.
            </p>
          </Card>
        </div>
      </section>

      <section aria-labelledby="links-heading" className="space-y-5">
        <h2
          className="text-on-surface text-2xl font-semibold tracking-tight"
          id="links-heading"
        >
          Navigation
        </h2>
        <Card variant="subtle">
          <LinkButton to="/">
            Zur Startseite
            <ArrowRight aria-hidden="true" size={18} />
          </LinkButton>
        </Card>
      </section>
    </div>
  )
}
