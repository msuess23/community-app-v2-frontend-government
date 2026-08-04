import { useState } from 'react'
import { FileText } from 'lucide-react'

import { resolveApiUrl } from '@/api/client/api-url'
import { cn } from '@/shared/lib/cn'

export interface MediaImageProps {
  altText: string | null
  className?: string
  decorative?: boolean
  loading?: 'eager' | 'lazy'
  url: string
}

/** Renders one backend image with a stable fallback and explicit alt-text semantics. */
export function MediaImage({
  altText,
  className,
  decorative = false,
  loading = 'lazy',
  url,
}: MediaImageProps) {
  const [hasError, setHasError] = useState(false)

  if (hasError) {
    return (
      <span
        aria-label={decorative ? undefined : 'Bild konnte nicht geladen werden'}
        className={cn(
          'bg-surface-container text-on-surface-variant flex items-center justify-center gap-2',
          className,
        )}
        role={decorative ? undefined : 'img'}
      >
        <FileText aria-hidden="true" size={24} />
        {decorative ? null : (
          <span className="sr-only">Bild konnte nicht geladen werden.</span>
        )}
      </span>
    )
  }

  return (
    <img
      alt={decorative ? '' : (altText ?? '')}
      className={className}
      loading={loading}
      onError={() => setHasError(true)}
      src={resolveApiUrl(url)}
    />
  )
}
