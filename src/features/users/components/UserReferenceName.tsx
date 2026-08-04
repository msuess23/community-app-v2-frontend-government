import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'

import { getUserDisplayName } from '@/features/users/model/user-model'
import { createUserDetailQueryOptions } from '@/features/users/queries/user-queries'

export interface UserReferenceNameProps {
  linkToProfile?: boolean
  userId: string
}

/** Resolves one audit actor to a readable name without exposing identifiers. */
export function UserReferenceName({
  linkToProfile = true,
  userId,
}: UserReferenceNameProps) {
  const query = useQuery({
    ...createUserDetailQueryOptions(userId),
    enabled: userId.length > 0,
    retry: false,
  })

  if (query.isPending) {
    return <span aria-label="Benutzername wird geladen">Wird geladen …</span>
  }

  if (!query.data) {
    return <span>Benutzer nicht mehr verfügbar</span>
  }

  const name = getUserDisplayName(query.data)

  return linkToProfile ? (
    <Link
      className="text-primary focus-visible:outline-primary rounded-sm underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
      to={`/users/${query.data.id}`}
    >
      {name}
    </Link>
  ) : (
    name
  )
}
