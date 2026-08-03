import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'

import { getUserDisplayName } from '@/features/users/model/user-model'
import { createUserDetailQueryOptions } from '@/features/users/queries/user-queries'

export interface UserReferenceNameProps {
  linkToProfile?: boolean
  userId: string
}

/** Resolves one audit actor ID to a readable user name with a safe technical fallback. */
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
    return (
      <span title={userId}>
        Nicht auflösbar ({shortenIdentifier(userId)})
      </span>
    )
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

/** Keeps fallback identifiers useful without letting UUIDs dominate audit cards. */
function shortenIdentifier(value: string): string {
  return value.length > 12 ? `${value.slice(0, 8)}…` : value
}
