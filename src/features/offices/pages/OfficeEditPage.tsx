import { useQuery } from '@tanstack/react-query'
import { ShieldAlert } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router'

import { OfficeForm } from '@/features/offices/components/OfficeForm'
import { OfficeStatusBadge } from '@/features/offices/components/OfficeStatusBadge'
import type { OfficeRecord } from '@/features/offices/model/office-model'
import { useUpdateOfficeMutation } from '@/features/offices/queries/office-admin-mutations'
import { createOfficeDetailQueryOptions } from '@/features/offices/queries/office-queries'
import { useFeedback } from '@/shared/feedback/feedback-context'
import { RemoteDataBoundary } from '@/shared/remote-data/RemoteDataBoundary'
import { resolveResourceDetailReturnTo } from '@/shared/resource-detail/detail-navigation'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { PageHeader } from '@/shared/ui/PageHeader'

/** Loads one office for the administrator-only edit workflow. */
export function OfficeEditPage() {
  const { officeId = '' } = useParams()
  const query = useQuery({
    ...createOfficeDetailQueryOptions(officeId),
    enabled: officeId.length > 0,
  })

  return (
    <RemoteDataBoundary
      errorOptions={{
        fallback: {
          description:
            'Die Behörde konnte nicht für die Bearbeitung geladen werden.',
          title: 'Bearbeitung nicht verfügbar',
        },
      }}
      loadingLabel="Behörde wird für die Bearbeitung geladen."
      query={query}
    >
      {(office) => <OfficeEditForm office={office} />}
    </RemoteDataBoundary>
  )
}

/** Owns one edit session and preserves its directory return target. */
function OfficeEditForm({ office }: Readonly<{ office: OfficeRecord }>) {
  const { notify } = useFeedback()
  const location = useLocation()
  const navigate = useNavigate()
  const mutation = useUpdateOfficeMutation()
  const detailPath = `/offices/${office.id}`
  const listReturnTo = resolveListReturnTo(location.state)

  if (!office.isActive) {
    return (
      <div className="space-y-6">
        <PageHeader
          description="Deaktivierte Behörden können nicht mehr administrativ bearbeitet werden."
          eyebrow="Behördenverwaltung"
          title={office.name}
        />
        <Card variant="subtle">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <span className="bg-error-container text-on-error-container flex size-12 shrink-0 items-center justify-center rounded-full">
              <ShieldAlert aria-hidden="true" size={24} />
            </span>
            <div className="space-y-3">
              <h2 className="text-xl font-semibold">Bearbeitung nicht möglich</h2>
              <p className="text-on-surface-variant leading-7">
                Die Behörde ist deaktiviert. Eine Reaktivierung wird vom Backend
                derzeit nicht unterstützt.
              </p>
              <Button
                onPress={() =>
                  navigate(detailPath, { state: { from: listReturnTo } })
                }
                variant="outline"
              >
                Zur Behördendetailseite
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        actions={<OfficeStatusBadge isActive={office.isActive} />}
        description="Passe Stammdaten strukturiert an. Nur tatsächlich geänderte Felder werden an das Backend übertragen."
        eyebrow="Behördenverwaltung"
        title={office.name}
      />

      <OfficeForm
        isPending={mutation.isPending}
        mode="edit"
        office={office}
        onCancel={() =>
          navigate(detailPath, { state: { from: listReturnTo } })
        }
        onSaved={(updatedOffice) => {
          notify({
            dedupeKey: `office-update:${updatedOffice.id}`,
            description:
              'Die Behördendaten entsprechen jetzt dem bestätigten Serverstand.',
            title: 'Behörde gespeichert',
            tone: 'success',
          })
          navigate(detailPath, {
            replace: true,
            state: { from: listReturnTo },
          })
        }}
        save={(values) => mutation.mutateAsync({ office, values })}
      />
    </div>
  )
}

/** Reads the original directory target forwarded through the detail page. */
function resolveListReturnTo(state: unknown): string {
  if (typeof state !== 'object' || state === null || !('listFrom' in state)) {
    return '/offices'
  }

  const listFrom = (state as { listFrom?: unknown }).listFrom
  return resolveResourceDetailReturnTo({ from: listFrom }, '/offices')
}
