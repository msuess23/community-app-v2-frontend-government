import { useQuery } from '@tanstack/react-query'
import { History, Mail, Pencil, UserRoundCheck } from 'lucide-react'
import { useLocation, useParams } from 'react-router'

import { useAuth } from '@/auth/auth-context'
import { hasCapability } from '@/auth/capabilities'
import { getRoleLabel } from '@/auth/role-labels'
import { UserLifecycleActions } from '@/features/users/components/UserLifecycleActions'
import { UserOfficeName } from '@/features/users/components/UserOfficeName'
import { UserStatusBadge } from '@/features/users/components/UserStatusBadge'
import { getUserDisplayName } from '@/features/users/model/user-model'
import { createUserDetailQueryOptions } from '@/features/users/queries/user-queries'
import { formatDisplayDateTime } from '@/shared/format/display-values'
import { RemoteDataBoundary } from '@/shared/remote-data/RemoteDataBoundary'
import {
  ResourceDetailLayout,
  ResourceDetailSection,
  ResourceMetadataList,
} from '@/shared/resource-detail/ResourceDetailLayout'
import { resolveResourceDetailReturnTo } from '@/shared/resource-detail/detail-navigation'
import { LinkButton } from '@/shared/ui/LinkButton'

/** Shows one backend-authorized user profile and capability-gated follow-up actions. */
export function UserDetailPage() {
  const { user: currentUser } = useAuth()
  const { userId = '' } = useParams()
  const location = useLocation()
  const query = useQuery({
    ...createUserDetailQueryOptions(userId),
    enabled: userId.length > 0,
  })
  const returnTo = resolveResourceDetailReturnTo(location.state, '/users')

  return (
    <RemoteDataBoundary
      errorOptions={{
        fallback: {
          description:
            'Das Benutzerprofil konnte nicht geladen werden. Prüfe den Zugriff und versuche es erneut.',
          title: 'Benutzerprofil nicht verfügbar',
        },
      }}
      loadingLabel="Benutzerprofil wird geladen."
      query={query}
    >
      {(user) => {
        const isOwnAccount = currentUser?.id === user.id
        const canViewAdministration = hasCapability(currentUser, 'manageUsers')
        const canManageUser = user.isActive && canViewAdministration
        const canDeactivateUser = canManageUser && !isOwnAccount

        return (
          <ResourceDetailLayout
            actions={
              isOwnAccount || canViewAdministration ? (
                <div className="flex flex-wrap gap-2">
                  {isOwnAccount ? (
                    <LinkButton to="/account" variant="secondary">
                      <UserRoundCheck aria-hidden="true" size={18} />
                      Eigenes Profil bearbeiten
                    </LinkButton>
                  ) : null}
                  {canManageUser ? (
                    <LinkButton
                      state={{
                        from: `/users/${user.id}`,
                        listFrom: returnTo,
                      }}
                      to={`/users/${user.id}/edit`}
                    >
                      <Pencil aria-hidden="true" size={18} />
                      Administrativ bearbeiten
                    </LinkButton>
                  ) : null}
                  {canViewAdministration ? (
                    <LinkButton
                      state={{ listFrom: returnTo }}
                      to={`/users/${user.id}/history`}
                      variant="outline"
                    >
                      <History aria-hidden="true" size={18} />
                      Änderungshistorie
                    </LinkButton>
                  ) : null}
                  {canDeactivateUser ? (
                    <UserLifecycleActions user={user} />
                  ) : null}
                </div>
              ) : undefined
            }
            backLink={{ label: 'Zurück zum Benutzerverzeichnis', to: returnTo }}
            description={
              isOwnAccount
                ? 'Dies ist dein eigenes Konto. Namen und Sitzungen verwaltest du auf der Kontoseite.'
                : 'Die angezeigten Angaben entsprechen dem aktuell gespeicherten Kontostand.'
            }
            eyebrow="Benutzerprofil"
            status={<UserStatusBadge isActive={user.isActive} />}
            title={getUserDisplayName(user)}
          >
            <ResourceDetailSection
              description="Kontaktdaten, Rolle und organisatorische Zuordnung."
              id="profile"
              title="Profildaten"
            >
              <ResourceMetadataList
                items={[
                  {
                    label: 'E-Mail-Adresse',
                    value: (
                      <a
                        className="text-primary focus-visible:outline-primary inline-flex items-center gap-2 rounded-sm break-all underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
                        href={`mailto:${user.email}`}
                      >
                        <Mail aria-hidden="true" size={17} />
                        {user.email}
                      </a>
                    ),
                  },
                  { label: 'Rolle', value: getRoleLabel(user.role) },
                  {
                    label: 'Zugeordnete Behörde',
                    value: <UserOfficeName officeId={user.officeId} />,
                  },
                ]}
              />
            </ResourceDetailSection>

            <ResourceDetailSection
              description="Technische und zeitliche Metadaten des Kontos."
              id="lifecycle"
              title="Kontostatus"
              variant="subtle"
            >
              <ResourceMetadataList
                items={[
                  {
                    label: 'Status',
                    value: user.isActive ? 'Aktiv' : 'Deaktiviert',
                  },
                  {
                    label: 'Erstellt am',
                    value: formatDisplayDateTime(user.createdAt),
                  },
                  {
                    label: 'Deaktiviert am',
                    value: user.deactivatedAt
                      ? formatDisplayDateTime(user.deactivatedAt)
                      : 'Nicht deaktiviert',
                  },
                  {
                    label: 'Benutzer-ID',
                    value: <code className="break-all">{user.id}</code>,
                  },
                ]}
              />
            </ResourceDetailSection>
          </ResourceDetailLayout>
        )
      }}
    </RemoteDataBoundary>
  )
}
