import { useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router'

import { useAuth } from '@/auth/auth-context'
import { Button } from '@/shared/ui/Button'
import { LinkButton } from '@/shared/ui/LinkButton'

export function RootLayout() {
  const { isAuthenticated, isInitializing, logout, user } = useAuth()
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  return (
    <div className="bg-surface-container-low text-on-surface min-h-screen">
      <a
        className="bg-on-surface text-surface focus:outline-primary fixed top-3 left-3 z-50 -translate-y-24 rounded-md px-4 py-2 font-semibold transition focus:translate-y-0 focus:outline-2 focus:outline-offset-2"
        href="#main-content"
      >
        Zum Hauptinhalt springen
      </a>

      <header className="border-outline-variant bg-surface-container-lowest border-b">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
          <Link
            className="text-primary focus-visible:outline-primary rounded-md font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4"
            to="/"
          >
            Community-App · Behördenclient
          </Link>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {isAuthenticated && user ? (
              <>
                <span className="text-on-surface-variant text-sm">
                  {user.firstName} {user.lastName}
                </span>
                <Button
                  isDisabled={isLoggingOut}
                  onPress={() => {
                    setIsLoggingOut(true)
                    void logout().finally(() => {
                      navigate('/login', { replace: true })
                    })
                  }}
                  size="sm"
                  variant="ghost"
                >
                  {isLoggingOut ? 'Abmeldung läuft …' : 'Abmelden'}
                </Button>
              </>
            ) : isInitializing ? (
              <span className="text-on-surface-variant text-sm">
                Sitzung wird geprüft …
              </span>
            ) : (
              <>
                <LinkButton size="sm" to="/login" variant="ghost">
                  Anmelden
                </LinkButton>
                <LinkButton size="sm" to="/register" variant="outline">
                  Registrieren
                </LinkButton>
              </>
            )}
          </div>
        </div>
      </header>

      <main
        className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8"
        id="main-content"
        tabIndex={-1}
      >
        <Outlet />
      </main>
    </div>
  )
}
