import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useAuth } from '@/auth/auth-context'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { PageHeader } from '@/shared/ui/PageHeader'

export function ForbiddenPage() {
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const isCitizen = user?.role === 'CITIZEN'

  return (
    <section aria-labelledby="forbidden-heading" className="space-y-6">
      <PageHeader
        description={
          isCitizen
            ? 'Dieses Bürgerkonto besitzt keine Berechtigung für den Behördenclient.'
            : 'Deine Rolle erlaubt den Zugriff auf diese Seite nicht.'
        }
        eyebrow="Fehler 403"
        headingId="forbidden-heading"
        title="Zugriff nicht erlaubt"
      />

      <Card className="max-w-2xl">
        <p className="text-on-surface-variant leading-7">
          {isCitizen
            ? 'Behördenrollen werden ausschließlich durch die Administration vergeben. Melde dich mit einem berechtigten Behördenkonto an.'
            : 'Wende dich an die Administration, falls du diese Funktion für deine Arbeit benötigst.'}
        </p>

        {user ? (
          <Button
            className="mt-5"
            isDisabled={isLoggingOut}
            onPress={() => {
              setIsLoggingOut(true)
              void logout().finally(() => {
                navigate('/login', { replace: true })
              })
            }}
            variant="outline"
          >
            {isLoggingOut ? 'Abmeldung läuft …' : 'Abmelden und Konto wechseln'}
          </Button>
        ) : null}
      </Card>
    </section>
  )
}
