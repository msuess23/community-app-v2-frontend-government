import { LinkButton } from '@/shared/ui/LinkButton'
import { PageHeader } from '@/shared/ui/PageHeader'

export function NotFoundPage() {
  return (
    <section aria-labelledby="not-found-heading" className="max-w-2xl">
      <PageHeader
        description={
          <p>Die aufgerufene Adresse existiert nicht oder wurde verschoben.</p>
        }
        eyebrow="Fehler 404"
        headingId="not-found-heading"
        title="Seite nicht gefunden"
      />
      <LinkButton className="mt-6" to="/">
        Zur Startseite
      </LinkButton>
    </section>
  )
}
