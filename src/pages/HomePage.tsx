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
            Die geschützte Anwendungssitzung ist eingerichtet. Fachliche
            Arbeitsbereiche werden in den folgenden Patches ergänzt.
          </p>
        }
        eyebrow="Community-App"
        headingId="home-heading"
        title="Behördenclient"
      />

      <Card>
        <h2 className="text-on-surface text-lg font-semibold">
          Technischer Stand
        </h2>
        <p className="text-on-surface-variant mt-2 leading-7">
          Routing, wiederverwendbare UI- und Formbausteine, API-Transport sowie
          Anmeldung und Sitzungswiederherstellung stehen bereit.
        </p>
        <LinkButton className="mt-5" to="/ui-kit" variant="outline">
          UI-Bausteine ansehen
          <ArrowRight aria-hidden="true" size={18} />
        </LinkButton>
      </Card>
    </section>
  )
}
