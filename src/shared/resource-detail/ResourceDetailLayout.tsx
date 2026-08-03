import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { cn } from '@/shared/lib/cn'
import { Card } from '@/shared/ui/Card'
import { PageHeader } from '@/shared/ui/PageHeader'

export type ResourceDetailBackLink = Readonly<{
  label: string
  state?: unknown
  to: string
}>

export type ResourceDetailNavigationItem = Readonly<{
  id: string
  label: string
}>

export interface ResourceDetailLayoutProps {
  actions?: ReactNode
  aside?: ReactNode
  backLink?: ResourceDetailBackLink
  children: ReactNode
  className?: string
  description?: ReactNode
  eyebrow?: ReactNode
  navigationItems?: ReadonlyArray<ResourceDetailNavigationItem>
  status?: ReactNode
  title: ReactNode
}

/** Composes the shared heading, navigation and content regions of a resource detail page. */
export function ResourceDetailLayout({
  actions,
  aside,
  backLink,
  children,
  className,
  description,
  eyebrow,
  navigationItems = [],
  status,
  title,
}: ResourceDetailLayoutProps) {
  return (
    <div className={cn('space-y-6 sm:space-y-8', className)}>
      {backLink ? <ResourceDetailBackLinkView backLink={backLink} /> : null}

      <PageHeader
        actions={actions}
        description={
          status || description ? (
            <div className="space-y-3">
              {status ? <div>{status}</div> : null}
              {description ? <div>{description}</div> : null}
            </div>
          ) : undefined
        }
        eyebrow={eyebrow}
        title={title}
      />

      {navigationItems.length > 0 ? (
        <ResourceDetailSectionNavigation items={navigationItems} />
      ) : null}

      <div
        className={cn(
          'grid items-start gap-6',
          aside ? 'xl:grid-cols-[minmax(0,1fr)_20rem]' : undefined,
        )}
      >
        <div className="min-w-0 space-y-6">{children}</div>
        {aside ? (
          <aside className="min-w-0 space-y-6 xl:sticky xl:top-6">
            {aside}
          </aside>
        ) : null}
      </div>
    </div>
  )
}

export interface ResourceDetailSectionProps {
  actions?: ReactNode
  children: ReactNode
  className?: string
  description?: ReactNode
  id: string
  title: ReactNode
  variant?: 'default' | 'outlined' | 'subtle'
}

/** Renders one named, linkable section inside a resource detail workspace. */
export function ResourceDetailSection({
  actions,
  children,
  className,
  description,
  id,
  title,
  variant = 'default',
}: ResourceDetailSectionProps) {
  const headingId = `${id}-heading`

  return (
    <Card
      aria-labelledby={headingId}
      className={cn('scroll-mt-24', className)}
      id={id}
      role="region"
      variant={variant}
    >
      <div className="space-y-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            <h2
              className="text-on-surface text-xl font-semibold tracking-tight sm:text-2xl"
              id={headingId}
            >
              {title}
            </h2>
            {description ? (
              <div className="text-on-surface-variant max-w-3xl leading-7">
                {description}
              </div>
            ) : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
          ) : null}
        </header>
        {children}
      </div>
    </Card>
  )
}

export type ResourceMetadataItem = Readonly<{
  label: ReactNode
  value: ReactNode
}>

export interface ResourceMetadataListProps {
  className?: string
  items: ReadonlyArray<ResourceMetadataItem>
}

/** Presents compact resource metadata as an accessible description list. */
export function ResourceMetadataList({
  className,
  items,
}: ResourceMetadataListProps) {
  return (
    <dl
      className={cn(
        'grid gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-3',
        className,
      )}
    >
      {items.map((item, index) => (
        <div className="min-w-0 space-y-1" key={index}>
          <dt className="text-on-surface-variant text-sm font-medium">
            {item.label}
          </dt>
          <dd className="text-on-surface leading-6 break-words">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/** Renders the list-return link above a detail heading without relying on browser history. */
function ResourceDetailBackLinkView({
  backLink,
}: Readonly<{ backLink: ResourceDetailBackLink }>) {
  return (
    <Link
      className="text-primary hover:bg-primary-container focus-visible:outline-primary inline-flex min-h-11 items-center gap-2 rounded-lg px-2 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
      state={backLink.state}
      to={backLink.to}
    >
      <ArrowLeft aria-hidden="true" size={18} />
      {backLink.label}
    </Link>
  )
}

/** Offers anchor navigation for long detail pages while preserving semantic sections. */
function ResourceDetailSectionNavigation({
  items,
}: Readonly<{ items: ReadonlyArray<ResourceDetailNavigationItem> }>) {
  return (
    <nav aria-label="Abschnitte dieser Detailansicht">
      <ul className="border-outline-variant flex gap-2 overflow-x-auto border-b pb-3">
        {items.map((item) => (
          <li className="shrink-0" key={item.id}>
            <a
              className="text-primary hover:bg-primary-container focus-visible:outline-primary inline-flex min-h-11 items-center rounded-lg px-3 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
              href={`#${item.id}`}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
