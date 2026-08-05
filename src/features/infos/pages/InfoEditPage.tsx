import { useQuery } from '@tanstack/react-query'
import { ShieldAlert } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router'

import { useAuth } from '@/auth/auth-context'
import type { AuthUser } from '@/auth/auth-types'
import { InfoCategoryBadge } from '@/features/infos/components/InfoBadges'
import { InfoForm } from '@/features/infos/components/InfoForm'
import { InfoImageManager } from '@/features/infos/components/InfoImageManager'
import { canManageInfo } from '@/features/infos/model/info-permissions'
import type { InfoRecord } from '@/features/infos/model/info-model'
import { useUpdateInfoMutation } from '@/features/infos/queries/info-admin-mutations'
import {
  createInfoDetailQueryOptions,
  createInfoImagesQueryOptions,
} from '@/features/infos/queries/info-queries'
import { useFeedback } from '@/shared/feedback/feedback-context'
import { createOfficeDirectoryQueryOptions } from '@/shared/offices/office-queries'
import type { OfficeReference } from '@/shared/offices/office-model'
import { RemoteDataBoundary } from '@/shared/remote-data/RemoteDataBoundary'
import { resolveResourceDetailReturnTo } from '@/shared/resource-detail/detail-navigation'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { PageHeader } from '@/shared/ui/PageHeader'

/** Loads one Info and its permitted office choices for in-place editing. */
export function InfoEditPage() {
  const { infoId = '' } = useParams()
  const { user } = useAuth()
  const infoQuery = useQuery({
    ...createInfoDetailQueryOptions(infoId),
    enabled: infoId.length > 0,
  })
  const officesQuery = useQuery({
    ...createOfficeDirectoryQueryOptions(
      user?.role === 'ADMIN' ? 'all' : 'active',
    ),
    enabled: user !== null,
  })

  if (!user) {
    return null
  }

  return (
    <RemoteDataBoundary
      errorOptions={{
        messagesByErrorCode: {
          INFO_NOT_FOUND: {
            description:
              'Die Mitteilung wurde gelöscht oder ist nicht mehr verfügbar.',
            title: 'Bearbeitung nicht verfügbar',
          },
        },
        fallback: {
          description:
            'Die Mitteilung konnte nicht für die Bearbeitung geladen werden.',
          title: 'Bearbeitung nicht verfügbar',
        },
      }}
      loadingLabel="Mitteilung wird für die Bearbeitung geladen."
      query={infoQuery}
    >
      {(info) => {
        if (!canManageInfo(user, info)) {
          return <InfoEditForbidden info={info} />
        }

        return (
          <RemoteDataBoundary
            errorOptions={{
              fallback: {
                description:
                  'Die Behördenauswahl konnte nicht geladen werden. Versuche es erneut.',
                title: 'Bearbeitung nicht verfügbar',
              },
            }}
            loadingLabel="Behördenzuordnung wird geladen."
            query={officesQuery}
          >
            {(offices) => (
              <InfoEditForm info={info} offices={offices} user={user} />
            )}
          </RemoteDataBoundary>
        )
      }}
    </RemoteDataBoundary>
  )
}

function InfoEditForm({
  info,
  offices,
  user,
}: Readonly<{
  info: InfoRecord
  offices: readonly OfficeReference[]
  user: AuthUser
}>) {
  const { notify } = useFeedback()
  const location = useLocation()
  const navigate = useNavigate()
  const mutation = useUpdateInfoMutation(user)
  const imagesQuery = useQuery(createInfoImagesQueryOptions(info.id))
  const detailPath = `/infos/${info.id}`
  const listReturnTo = resolveListReturnTo(location.state)

  return (
    <div className="space-y-8">
      <PageHeader
        actions={<InfoCategoryBadge category={info.category} />}
        description="Passe Stammdaten und Bilder an. Bildaktionen werden über eigene Endpunkte unmittelbar gespeichert; Stammdaten erst mit dem Formularabschluss."
        eyebrow="Mitteilungsverwaltung"
        title={info.title}
      />

      <InfoForm
        currentUser={user}
        imageSection={
          <RemoteDataBoundary
            errorOptions={{
              fallback: {
                description:
                  'Die Bilder konnten nicht für die Bearbeitung geladen werden. Die Stammdaten bleiben bearbeitbar.',
                title: 'Bildverwaltung nicht verfügbar',
              },
            }}
            loadingLabel="Bilder werden für die Bearbeitung geladen."
            query={imagesQuery}
          >
            {(images) => (
              <InfoImageManager assets={images} infoId={info.id} />
            )}
          </RemoteDataBoundary>
        }
        info={info}
        isPending={mutation.isPending}
        mode="edit"
        offices={offices}
        onCancel={() =>
          navigate(detailPath, { state: { from: listReturnTo } })
        }
        onSaved={(updatedInfo) => {
          notify({
            dedupeKey: `info-update:${updatedInfo.id}`,
            description:
              'Die Mitteilung entspricht jetzt dem bestätigten Serverstand.',
            title: 'Mitteilung gespeichert',
            tone: 'success',
          })
          navigate(detailPath, {
            replace: true,
            state: { from: listReturnTo },
          })
        }}
        save={(values) => mutation.mutateAsync({ info, values })}
      />
    </div>
  )
}

function InfoEditForbidden({ info }: Readonly<{ info: InfoRecord }>) {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <PageHeader
        description="Officer und Manager dürfen nur Mitteilungen ihrer eigenen Behörde bearbeiten. Administratoren dürfen alle Mitteilungen verwalten."
        eyebrow="Mitteilungsverwaltung"
        title={info.title}
      />
      <Card variant="subtle">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <span className="bg-error-container text-on-error-container flex size-12 shrink-0 items-center justify-center rounded-full">
            <ShieldAlert aria-hidden="true" size={24} />
          </span>
          <div className="space-y-3">
            <h2 className="text-xl font-semibold">Bearbeitung nicht erlaubt</h2>
            <p className="text-on-surface-variant leading-7">
              Die Behördenzuordnung dieser Mitteilung entspricht nicht deiner
              eigenen Zuständigkeit.
            </p>
            <Button
              onPress={() => navigate(`/infos/${info.id}`)}
              variant="outline"
            >
              Zur Mitteilungsdetailseite
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

function resolveListReturnTo(state: unknown): string {
  if (typeof state !== 'object' || state === null || !('listFrom' in state)) {
    return '/infos'
  }

  const listFrom = (state as { listFrom?: unknown }).listFrom
  return resolveResourceDetailReturnTo({ from: listFrom }, '/infos')
}
