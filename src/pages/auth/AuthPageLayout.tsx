import type { ReactNode } from 'react'

import { Card } from '@/shared/ui/Card'
import { PageHeader } from '@/shared/ui/PageHeader'

export type AuthPageLayoutProps = Readonly<{
  children: ReactNode
  description: ReactNode
  footer?: ReactNode
  title: string
}>

export function AuthPageLayout({
  children,
  description,
  footer,
  title,
}: AuthPageLayoutProps) {
  return (
    <section className="mx-auto w-full max-w-lg space-y-6">
      <PageHeader
        description={description}
        eyebrow="Community-App"
        title={title}
      />

      <Card padding="lg">{children}</Card>

      {footer ? (
        <div className="text-on-surface-variant text-center text-sm leading-6">
          {footer}
        </div>
      ) : null}
    </section>
  )
}
