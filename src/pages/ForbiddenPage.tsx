import { LinkButton } from '@/shared/ui/LinkButton'
import { Card } from '@/shared/ui/Card'
import { PageHeader } from '@/shared/ui/PageHeader'

/**
 * Explains that the current authority role cannot access a protected function.
 */
export function ForbiddenPage() {
  return (
    <section aria-labelledby="forbidden-heading" className="space-y-6">
      <PageHeader
        description="Deine aktuelle Rolle erlaubt den Zugriff auf diese Seite nicht."
        eyebrow="Fehler 403"
        headingId="forbidden-heading"
        title="Zugriff nicht erlaubt"
      />

      <Card className="max-w-2xl">
        <p className="text-on-surface-variant leading-7">
          Wende dich an die Administration, falls du diese Funktion für deine
          Arbeit benötigst.
        </p>
        <LinkButton className="mt-5" to="/" variant="outline">
          Zur Übersicht
        </LinkButton>
      </Card>
    </section>
  )
}
