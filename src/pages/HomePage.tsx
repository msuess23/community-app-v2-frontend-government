import { ShieldCheck, Smartphone } from 'lucide-react'

import { useAuth } from '@/auth/auth-context'
import { getRoleLabel } from '@/auth/role-labels'
import { Card } from '@/shared/ui/Card'
import { PageHeader } from '@/shared/ui/PageHeader'

/**
 * Introduces the authenticated workspace before the feature modules are added.
 */
export function HomePage() {
  const { user } = useAuth()

  return (
    <section aria-labelledby="home-heading" className="space-y-8">
      <PageHeader
        description={
          <p>
            Willkommen{user ? `, ${user.firstName}` : ''}. Von hier aus werden
            die fachlichen Arbeitsbereiche des Behördenclients erreichbar sein.
          </p>
        }
        eyebrow="Community-App"
        headingId="home-heading"
        title="Übersicht"
      />

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <div className="flex items-start gap-4">
            <span className="bg-primary-container text-on-primary-container flex size-11 shrink-0 items-center justify-center rounded-lg">
              <ShieldCheck aria-hidden="true" size={22} />
            </span>
            <div>
              <h2 className="text-on-surface text-lg font-semibold">
                Sicher angemeldet
              </h2>
              <p className="text-on-surface-variant mt-2 leading-7">
                {user
                  ? `Der Behördenclient ist für deine Rolle „${getRoleLabel(user.role)}“ freigeschaltet.`
                  : 'Der geschützte Anwendungsbereich ist freigeschaltet.'}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start gap-4">
            <span className="bg-secondary-container text-on-secondary-container flex size-11 shrink-0 items-center justify-center rounded-lg">
              <Smartphone aria-hidden="true" size={22} />
            </span>
            <div>
              <h2 className="text-on-surface text-lg font-semibold">
                Für alle Geräte vorbereitet
              </h2>
              <p className="text-on-surface-variant mt-2 leading-7">
                Navigation und Seitenrahmen passen sich an Smartphone, Tablet und
                Desktop an. Die Fachmodule werden schrittweise ergänzt.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </section>
  )
}
