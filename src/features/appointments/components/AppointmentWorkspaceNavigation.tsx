import { NavLink } from 'react-router'

import { cn } from '@/shared/lib/cn'

const ITEMS = [
  { end: true, label: 'Gebuchte Termine', to: '/appointments' },
  { end: false, label: 'Terminslots', to: '/appointments/slots' },
] as const

/** Provides consistent local navigation across the authority appointment workspace. */
export function AppointmentWorkspaceNavigation() {
  return (
    <nav aria-label="Bereiche der Terminverwaltung">
      <ul className="border-outline-variant flex flex-wrap gap-2 border-b pb-3">
        {ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              className={({ isActive }) =>
                cn(
                  'focus-visible:outline-primary inline-flex min-h-11 items-center rounded-lg px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2',
                  isActive
                    ? 'bg-primary text-on-primary'
                    : 'text-on-surface hover:bg-surface-container',
                )
              }
              end={item.end}
              to={item.to}
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
