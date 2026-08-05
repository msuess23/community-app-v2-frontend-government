import { useQuery } from '@tanstack/react-query'
import { MessageSquareText, UserRound } from 'lucide-react'

import { TicketCommentComposer } from '@/features/tickets/components/TicketCommentComposer'
import { TICKET_READ_ERROR_MESSAGES } from '@/features/tickets/model/ticket-error-messages'
import type { TicketCommentRecord } from '@/features/tickets/model/ticket-collaboration'
import { createTicketCommentsQueryOptions } from '@/features/tickets/queries/ticket-queries'
import { DataViewStatusBadge } from '@/shared/data-view/DataViewStatusBadge'
import { formatDisplayDateTime } from '@/shared/format/display-values'
import { RemoteDataBoundary } from '@/shared/remote-data/RemoteDataBoundary'

/** Loads immutable public comments and internal case notes visible to the actor. */
export function TicketComments({ ticketId }: Readonly<{ ticketId: string }>) {
  const query = useQuery(createTicketCommentsQueryOptions(ticketId))

  return (
    <div>
      <TicketCommentComposer ticketId={ticketId} />
      <RemoteDataBoundary
        empty={
          <p className="text-on-surface-variant leading-7">
            Für dieses Ticket wurden noch keine Kommentare oder internen
            Notizen erfasst.
          </p>
        }
        errorOptions={{
          fallback: {
            description:
              'Kommentare und interne Notizen konnten nicht geladen werden. Die übrigen Ticketdaten bleiben verfügbar.',
            title: 'Kommentare nicht verfügbar',
          },
          messagesByErrorCode: TICKET_READ_ERROR_MESSAGES,
        }}
        isEmpty={(comments) => comments.length === 0}
        loadingLabel="Kommentare und interne Notizen werden geladen."
        query={query}
      >
        {(comments) => <TicketCommentList comments={comments} />}
      </RemoteDataBoundary>
    </div>
  )
}

function TicketCommentList({
  comments,
}: Readonly<{ comments: readonly TicketCommentRecord[] }>) {
  return (
    <ol className="grid gap-4">
      {comments.map((comment) => (
        <li
          className="border-outline-variant bg-surface-container-lowest rounded-xl border p-4 sm:p-5"
          key={comment.id}
        >
          <article
            aria-label={createTicketCommentLabel(comment)}
          >
            <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="bg-primary-container text-on-primary-container flex size-10 shrink-0 items-center justify-center rounded-full">
                  {comment.author.authorType === 'AUTHORITY' ? (
                    <UserRound aria-hidden="true" size={19} />
                  ) : (
                    <MessageSquareText aria-hidden="true" size={19} />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold break-words">
                    {comment.author.displayName}
                  </p>
                  <p className="text-on-surface-variant text-sm">
                    {comment.author.authorType === 'AUTHORITY'
                      ? 'Behördenmitarbeiter'
                      : 'Bürger'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <DataViewStatusBadge
                  tone={comment.isInternal ? 'warning' : 'info'}
                >
                  {comment.isInternal ? 'Interne Notiz' : 'Öffentlich'}
                </DataViewStatusBadge>
                <time
                  className="text-on-surface-variant text-sm"
                  dateTime={comment.createdAt}
                >
                  {formatDisplayDateTime(comment.createdAt)}
                </time>
              </div>
            </header>
            <p className="mt-4 whitespace-pre-wrap leading-7">{comment.text}</p>
          </article>
        </li>
      ))}
    </ol>
  )
}

/** Builds a stable accessible name without hiding the comment body. */
function createTicketCommentLabel(comment: TicketCommentRecord): string {
  const kind = comment.isInternal
    ? 'Interne Notiz'
    : 'Öffentlicher Kommentar'
  return `${kind} von ${comment.author.displayName}, ${formatDisplayDateTime(comment.createdAt)}`
}
