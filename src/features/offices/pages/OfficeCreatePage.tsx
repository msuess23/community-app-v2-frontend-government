import { Building2 } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'

import { OfficeForm } from '@/features/offices/components/OfficeForm'
import { useCreateOfficeMutation } from '@/features/offices/queries/office-admin-mutations'
import { useFeedback } from '@/shared/feedback/feedback-context'
import { resolveResourceDetailReturnTo } from '@/shared/resource-detail/detail-navigation'
import { PageHeader } from '@/shared/ui/PageHeader'

/** Provides the administrator-only office creation workflow. */
export function OfficeCreatePage() {
  const { notify } = useFeedback()
  const location = useLocation()
  const navigate = useNavigate()
  const mutation = useCreateOfficeMutation()
  const returnTo = resolveResourceDetailReturnTo(location.state, '/offices')

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <span className="bg-primary-container text-on-primary-container flex size-12 items-center justify-center rounded-full">
            <Building2 aria-hidden="true" size={24} />
          </span>
        }
        description="Lege die Stammdaten einer neuen Behörde an. Ein Änderungsgrund ist bei der erstmaligen Erstellung nicht erforderlich."
        eyebrow="Behördenverwaltung"
        title="Behörde anlegen"
      />

      <OfficeForm
        isPending={mutation.isPending}
        mode="create"
        onCancel={() => navigate(returnTo)}
        onSaved={(office) => {
          notify({
            dedupeKey: `office-create:${office.id}`,
            description:
              'Die neue Behörde entspricht dem bestätigten Serverstand und ist in den Verzeichnissen verfügbar.',
            title: 'Behörde angelegt',
            tone: 'success',
          })
          navigate(`/offices/${office.id}`, {
            replace: true,
            state: { from: returnTo },
          })
        }}
        save={(values) => mutation.mutateAsync(values)}
      />
    </div>
  )
}
