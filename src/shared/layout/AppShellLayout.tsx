import { ChevronDown, LogOut, Menu, Settings, UserRound, X } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'

import { getPrimaryNavigationItems } from '@/app/navigation'
import { useAuth } from '@/auth/auth-context'
import { getRoleLabel } from '@/auth/role-labels'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/Button'

/**
 * Provides the responsive, authenticated application frame for authority features.
 */
export function AppShellLayout() {
  const { logout, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  // Binding the open state to the current path closes the mobile panel after navigation.
  const [navigationState, setNavigationState] = useState({
    isOpen: false,
    pathname: location.pathname,
  })
  const isNavigationOpen =
    navigationState.pathname === location.pathname && navigationState.isOpen
  const navigationItems = getPrimaryNavigationItems(user)

  /**
   * Ends the local session before returning to the public login route.
   */
  async function handleLogout(): Promise<void> {
    setIsLoggingOut(true)

    try {
      await logout()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  /**
   * Closes the mobile navigation with Escape and restores focus to its trigger.
   */
  function handleNavigationKeyDown(event: KeyboardEvent<HTMLElement>): void {
    if (event.key !== 'Escape' || !isNavigationOpen) {
      return
    }

    event.preventDefault()
    setNavigationState({ isOpen: false, pathname: location.pathname })
    document.getElementById('primary-navigation-toggle')?.focus()
  }

  /**
   * Closes the native account disclosure with Escape and restores summary focus.
   */
  function handleAccountMenuKeyDown(
    event: KeyboardEvent<HTMLDetailsElement>,
  ): void {
    if (event.key !== 'Escape' || !event.currentTarget.open) {
      return
    }

    event.preventDefault()
    event.currentTarget.open = false
    event.currentTarget.querySelector<HTMLElement>('summary')?.focus()
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-outline-variant bg-surface-container-lowest sticky top-0 z-40 border-b shadow-sm">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center gap-3 px-4 py-2 sm:px-6 lg:px-8">
          <Button
            aria-controls="primary-navigation"
            aria-expanded={isNavigationOpen}
            aria-label={
              isNavigationOpen
                ? 'Hauptnavigation schließen'
                : 'Hauptnavigation öffnen'
            }
            className="lg:hidden"
            id="primary-navigation-toggle"
            onPress={() =>
              setNavigationState({
                isOpen: !isNavigationOpen,
                pathname: location.pathname,
              })
            }
            size="sm"
            variant="ghost"
          >
            {isNavigationOpen ? (
              <X aria-hidden="true" size={20} />
            ) : (
              <Menu aria-hidden="true" size={20} />
            )}
          </Button>

          <Link
            className="text-primary focus-visible:outline-primary min-w-0 rounded-md font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4"
            to="/"
          >
            <span className="sm:hidden">Community-App</span>
            <span className="hidden sm:inline">
              Community-App · Behördenclient
            </span>
          </Link>

          {user ? (
            <details
              className="relative ml-auto"
              onKeyDown={handleAccountMenuKeyDown}
            >
              <summary className="focus-visible:outline-primary flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg px-2 py-1 text-left hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden">
                <span className="bg-primary-container text-on-primary-container flex size-9 shrink-0 items-center justify-center rounded-full">
                  <UserRound aria-hidden="true" size={19} />
                </span>
                <span className="hidden min-w-0 sm:block">
                  <span className="block truncate text-sm font-semibold">
                    {user.firstName} {user.lastName}
                  </span>
                  <span className="text-on-surface-variant block truncate text-xs">
                    {getRoleLabel(user.role)}
                  </span>
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className="text-on-surface-variant hidden sm:block"
                  size={17}
                />
                <span className="sr-only">Kontomenü öffnen</span>
              </summary>

              <div className="border-outline-variant bg-surface-container-lowest absolute top-full right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border p-3 shadow-lg">
                <div className="border-outline-variant border-b px-2 pb-3">
                  <p className="font-semibold">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-on-surface-variant mt-1 break-all text-sm">
                    {user.email}
                  </p>
                  <p className="text-on-surface-variant mt-1 text-sm">
                    {getRoleLabel(user.role)}
                  </p>
                </div>

                <Link
                  className="focus-visible:outline-primary mt-3 flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-primary hover:bg-primary-container focus-visible:outline-2 focus-visible:outline-offset-2"
                  onClick={(event) => {
                    event.currentTarget.closest('details')?.removeAttribute('open')
                  }}
                  to="/account"
                >
                  <Settings aria-hidden="true" size={18} />
                  Mein Konto
                </Link>

                <Button
                  className="mt-1 w-full justify-start"
                  isDisabled={isLoggingOut}
                  onPress={() => void handleLogout()}
                  size="sm"
                  variant="ghost"
                >
                  <LogOut aria-hidden="true" size={18} />
                  {isLoggingOut ? 'Abmeldung läuft …' : 'Abmelden'}
                </Button>
              </div>
            </details>
          ) : null}
        </div>

        <div
          className={cn(
            'border-outline-variant border-t lg:block',
            isNavigationOpen ? 'block' : 'hidden',
          )}
          id="primary-navigation"
          onKeyDown={handleNavigationKeyDown}
        >
          <nav
            aria-label="Hauptnavigation"
            className="mx-auto flex w-full max-w-7xl flex-col gap-1 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:px-8"
          >
            {navigationItems.map((item) => {
              const Icon = item.icon

              return (
                <NavLink
                  className={({ isActive }) =>
                    cn(
                      'focus-visible:outline-primary flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2',
                      isActive
                        ? 'bg-primary-container text-on-primary-container'
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
                    )
                  }
                  end={item.end}
                  key={item.to}
                  onClick={() =>
                    setNavigationState({
                      isOpen: false,
                      pathname: location.pathname,
                    })
                  }
                  to={item.to}
                >
                  <Icon aria-hidden="true" size={19} />
                  {item.label}
                </NavLink>
              )
            })}
          </nav>
        </div>
      </header>

      <main
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8"
        id="main-content"
        tabIndex={-1}
      >
        <Outlet />
      </main>
    </div>
  )
}
