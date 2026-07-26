import { ArrowRight } from 'lucide-react'

import { Card } from '@/shared/ui/Card'
import { LinkButton } from '@/shared/ui/LinkButton'
import { PageHeader } from '@/shared/ui/PageHeader'

export function HomePage() {
  return (
    <section aria-labelledby="home-heading" className="space-y-8">
      <PageHeader
        description={
          <p>
            Das technische Fundament der Anwendung ist eingerichtet. Fachliche
            Bereiche und die Authentifizierung werden in getrennten Patches
            ergänzt.
          </p>
        }
        eyebrow="Community-App"
        headingId="home-heading"
        title="Behördenclient"
      />

      <Card>
        <h2 className="text-on-surface text-lg font-semibold">
          Aktueller Stand
        </h2>
        <p className="text-on-surface-variant mt-2 leading-7">
          Routing, zentrale Provider, Fehlerbehandlung und die responsive
          Grundstruktur stehen für die nächsten Implementierungsschritte bereit.
        </p>
        <LinkButton className="mt-5" to="/ui-kit" variant="outline">
          UI-Bausteine ansehen
          <ArrowRight aria-hidden="true" size={18} />
        </LinkButton>
      </Card>
    </section>
  )
}
