import { LogOut, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router'

import { useAuth } from '@/auth/auth-context'
import { isAuthorityUser } from '@/auth/permissions'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { PageHeader } from '@/shared/ui/PageHeader'

/**
 * Explains the registration hand-off while an account still has the citizen role.
 */
export function AccessPendingPage() {
  const { logout, refreshCurrentUser, user } = useAuth()
  const navigate = useNavigate()
  const [isCheckingAccess, setIsCheckingAccess] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string>()

  if (isAuthorityUser(user)) {
    return <Navigate replace to="/" />
  }

  /**
   * Reloads the profile so newly assigned authority roles become effective immediately.
   */
  async function handleAccessCheck(): Promise<void> {
    setIsCheckingAccess(true)
    setStatusMessage(undefined)

    try {
      const refreshedUser = await refreshCurrentUser()

      if (isAuthorityUser(refreshedUser)) {
        navigate('/', { replace: true })
        return
      }

      setStatusMessage(
        'Für dieses Konto wurde noch keine Behördenrolle freigeschaltet.',
      )
    } catch {
      setStatusMessage(
        'Der Kontostatus konnte nicht geprüft werden. Versuche es erneut.',
      )
    } finally {
      setIsCheckingAccess(false)
    }
  }

  /**
   * Ends the pending citizen session and returns to the login page.
   */
  async function handleLogout(): Promise<void> {
    setIsLoggingOut(true)

    try {
      await logout()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  return (
    <section aria-labelledby="access-pending-heading" className="space-y-6">
      <PageHeader
        description="Dein Konto wurde erstellt, besitzt aber noch keine Rolle für den Behördenclient."
        eyebrow="Behördenzugang"
        headingId="access-pending-heading"
        title="Zugang noch nicht freigeschaltet"
      />

      <Card className="max-w-3xl">
        <div className="space-y-4">
          <p className="text-on-surface-variant leading-7">
            Eine Administration muss diesem Bürgerkonto zunächst die vorgesehene
            Behördenrolle und gegebenenfalls eine Behörde zuordnen. Danach kannst
            du den Zugang hier erneut prüfen oder dich neu anmelden.
          </p>

          {user ? (
            <dl className="bg-surface-container grid gap-3 rounded-lg p-4 text-sm sm:grid-cols-[max-content_1fr]">
              <dt className="font-semibold">Konto</dt>
              <dd className="break-all">{user.email}</dd>
              <dt className="font-semibold">Aktueller Status</dt>
              <dd>Bürgerkonto</dd>
            </dl>
          ) : null}

          {statusMessage ? (
            <p
              className="bg-secondary-container text-on-secondary-container rounded-lg p-4 text-sm font-medium"
              role="status"
            >
              {statusMessage}
            </p>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button
              isDisabled={isCheckingAccess || isLoggingOut}
              onPress={() => void handleAccessCheck()}
            >
              <RefreshCw aria-hidden="true" size={18} />
              {isCheckingAccess ? 'Zugang wird geprüft …' : 'Zugang erneut prüfen'}
            </Button>
            <Button
              isDisabled={isCheckingAccess || isLoggingOut}
              onPress={() => void handleLogout()}
              variant="outline"
            >
              <LogOut aria-hidden="true" size={18} />
              {isLoggingOut ? 'Abmeldung läuft …' : 'Abmelden und Konto wechseln'}
            </Button>
          </div>
        </div>
      </Card>
    </section>
  )
}
