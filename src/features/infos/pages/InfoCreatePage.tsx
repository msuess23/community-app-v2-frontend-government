import { Info as InfoIcon, ShieldAlert } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { useAuth } from '@/auth/auth-context'
import type { AuthUser } from '@/auth/auth-types'
import { InfoForm } from '@/features/infos/components/InfoForm'
import { InfoImageUploadQueue } from '@/features/infos/components/InfoImageUploadQueue'
import { canCreateInfo } from '@/features/infos/model/info-permissions'
import { useCreateInfoMutation } from '@/features/infos/queries/info-admin-mutations'
import { uploadInfoImage } from '@/features/infos/queries/info-image-mutations'
import { infoFeatureQueryKeys } from '@/features/infos/queries/info-query-keys'
import { useFeedback } from '@/shared/feedback/feedback-context'
import type { MediaUploadQueueHandle, MediaUploadSummary } from '@/shared/media/MediaUploadQueue'
import { createOfficeDirectoryQueryOptions } from '@/shared/offices/office-queries'
import { RemoteDataBoundary } from '@/shared/remote-data/RemoteDataBoundary'
import { resolveResourceDetailReturnTo } from '@/shared/resource-detail/detail-navigation'
import { Card } from '@/shared/ui/Card'
import { PageHeader } from '@/shared/ui/PageHeader'

/** Provides the role-aware Info creation workflow. */
export function InfoCreatePage() {
  const { user } = useAuth()

  return user ? <AuthenticatedInfoCreatePage user={user} /> : null
}

function AuthenticatedInfoCreatePage({
  user,
}: Readonly<{ user: AuthUser }>) {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { notify } = useFeedback()
  const uploadQueueRef = useRef<MediaUploadQueueHandle>(null)
  const createdInfoIdRef = useRef<string | null>(null)
  const uploadSummaryRef = useRef<MediaUploadSummary | null>(null)
  const officesQuery = useQuery(createOfficeDirectoryQueryOptions('active'))
  const returnTo = resolveResourceDetailReturnTo(location.state, '/infos')
  const mutation = useCreateInfoMutation(user)

  if (!canCreateInfo(user)) {
    return (
      <InfoAccessUnavailable
        description="Officer und Manager benötigen eine aktive eigene Behördenzuordnung, um Mitteilungen anzulegen."
        title="Mitteilung kann nicht angelegt werden"
      />
    )
  }

  return (
    <RemoteDataBoundary
      errorOptions={{
        fallback: {
          description:
            'Die Behördenauswahl konnte nicht geladen werden. Versuche es erneut.',
          title: 'Formular nicht verfügbar',
        },
      }}
      loadingLabel="Mitteilungsformular wird vorbereitet."
      query={officesQuery}
    >
      {(offices) => {
        const ownOfficeIsAvailable =
          user.role === 'ADMIN' ||
          offices.some(
            (office) => office.id === user.officeId && office.isActive,
          )

        if (!ownOfficeIsAvailable) {
          return (
            <InfoAccessUnavailable
              description="Die eigene Behörde ist nicht als aktive Behörde verfügbar. Das Backend würde die Veröffentlichung deshalb ablehnen."
              title="Behördenzuordnung nicht verfügbar"
            />
          )
        }

        return (
          <div className="space-y-8">
            <PageHeader
              actions={
                <span className="bg-primary-container text-on-primary-container flex size-12 items-center justify-center rounded-full">
                  <InfoIcon aria-hidden="true" size={24} />
                </span>
              }
              description="Lege Stammdaten und Bilder in einem gemeinsamen Formular fest. Beim Speichern werden zuerst die Stammdaten angelegt und danach die Bilder nacheinander hochgeladen."
              eyebrow="Mitteilungsverwaltung"
              title="Mitteilung anlegen"
            />

            <InfoForm
              currentUser={user}
              imageSection={
                <InfoImageUploadQueue
                  allowCoverSelection
                  id="info-create-images"
                  onUpload={async ({ description, file }) => {
                    const infoId = createdInfoIdRef.current
                    if (!infoId || !description) {
                      throw new Error(
                        'Info image upload requires a persisted Info and an alternative text.',
                      )
                    }
                    await uploadInfoImage(infoId, {
                      altText: description,
                      file,
                    })
                  }}
                  ref={uploadQueueRef}
                  showUploadAction={false}
                />
              }
              isPending={mutation.isPending}
              mode="create"
              offices={offices}
              onCancel={() => navigate(returnTo)}
              onSaved={(info) => {
                const summary = uploadSummaryRef.current
                const hasFailedImages = Boolean(summary?.failedCount)
                notify({
                  dedupeKey: `info-create:${info.id}`,
                  description: hasFailedImages
                    ? `${summary?.failedCount} Bilddatei(en) konnten nicht hochgeladen werden. Die Mitteilung wurde angelegt; wähle die fehlgeschlagenen Dateien auf der Bearbeitungsseite erneut aus.`
                    : summary?.uploadedCount
                      ? 'Die Mitteilung und alle ausgewählten Bilder entsprechen dem bestätigten Serverstand.'
                      : 'Die Mitteilung entspricht dem bestätigten Serverstand.',
                  title: hasFailedImages
                    ? 'Mitteilung angelegt, Bilder unvollständig'
                    : 'Mitteilung angelegt',
                  tone: hasFailedImages ? 'warning' : 'success',
                })
                navigate(
                  hasFailedImages
                    ? `/infos/${info.id}/edit`
                    : `/infos/${info.id}`,
                  {
                    replace: true,
                    state: { from: returnTo, listFrom: returnTo },
                  },
                )
              }}
              save={async (values) => {
                const info = await mutation.mutateAsync(values)
                createdInfoIdRef.current = info.id
                uploadSummaryRef.current =
                  (await uploadQueueRef.current?.uploadAll()) ?? null

                if (uploadSummaryRef.current?.attemptedCount) {
                  await Promise.all([
                    queryClient.invalidateQueries({
                      exact: true,
                      queryKey: infoFeatureQueryKeys.detail(info.id),
                    }),
                    queryClient.invalidateQueries({
                      exact: true,
                      queryKey: infoFeatureQueryKeys.images(info.id),
                    }),
                    queryClient.invalidateQueries({
                      queryKey: infoFeatureQueryKeys.lists(),
                    }),
                  ])
                }
                return info
              }}
              validateBeforeSave={() =>
                uploadQueueRef.current?.validateAll() === false
                  ? [
                      {
                        fieldId: 'info-create-images',
                        id: 'info-create-images-invalid',
                        message:
                          'Prüfe die ausgewählten Bilder und ihre Alternativtexte.',
                      },
                    ]
                  : []
              }
            />
          </div>
        )
      }}
    </RemoteDataBoundary>
  )
}

function InfoAccessUnavailable({
  description,
  title,
}: Readonly<{ description: string; title: string }>) {
  return (
    <div className="space-y-6">
      <PageHeader
        description="Die fachlichen Backendregeln verhindern diesen Verwaltungsworkflow."
        eyebrow="Mitteilungsverwaltung"
        title={title}
      />
      <Card variant="subtle">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <span className="bg-error-container text-on-error-container flex size-12 shrink-0 items-center justify-center rounded-full">
            <ShieldAlert aria-hidden="true" size={24} />
          </span>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Aktion nicht verfügbar</h2>
            <p className="text-on-surface-variant leading-7">{description}</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
