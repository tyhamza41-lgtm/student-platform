import { Link } from 'react-router'
import { Badge, Button, Card } from '../../../components/ui'
import { ROUTES } from '../../../constants/routes'
import { formatDate } from '../../../utils/formatDate'

const pageLoadedAt = Date.now()

function isUpcoming(event) {
  return new Date(event.date).getTime() > pageLoadedAt
}

function EventCard({
  event,
  isRegistered = false,
  canRegister = false,
  onRegister,
  editTo,
  onDelete,
  onViewParticipants,
}) {
  const upcoming = isUpcoming(event)
  const statusLabel = event.status === 'CANCELLED'
    ? 'Cancelled'
    : upcoming ? 'Upcoming' : 'Past event'
  const statusVariant = event.status === 'CANCELLED'
    ? 'danger'
    : upcoming ? 'success' : 'default'

  return (
    <article className="h-full min-w-0">
    <Card
      padding="none"
      className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 shadow-sm transition-shadow hover:shadow-md"
    >
      {event.imageUrl && (
        <img
          src={event.imageUrl}
          alt=""
          className="h-36 w-full bg-slate-100 object-cover sm:h-40"
        />
      )}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold leading-snug text-slate-950 sm:text-lg">
              {event.title}
            </h2>
            <p className="mt-1 truncate text-sm font-medium text-indigo-700">
              {event.organizer || 'Campus event'}
            </p>
          </div>
          <Badge variant={statusVariant} className="shrink-0">{statusLabel}</Badge>
        </div>

        <p className="mt-3 line-clamp-2 text-sm leading-5 text-slate-600">
          {event.description}
        </p>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs font-medium text-slate-400">Date &amp; time</dt>
            <dd className="mt-0.5 font-semibold text-slate-700">
              {formatDate(event.date, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-400">Location</dt>
            <dd className="mt-0.5 break-words font-semibold text-slate-700">{event.location}</dd>
          </div>
        </dl>

        <div className="mt-auto pt-4">
          <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span className="font-semibold tabular-nums text-slate-900">{event.participantCount ?? 0}</span>
              <span>participants</span>
              {isRegistered && <Badge variant="success" size="xs">Registered</Badge>}
            </div>
            <Link
              to={ROUTES.EVENT_DETAILS(event.id)}
              className="inline-flex min-h-9 shrink-0 items-center rounded-lg px-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              Event details
            </Link>
          </div>
          {(canRegister || editTo || onDelete || onViewParticipants) && (
            <div className="mt-2 flex flex-wrap gap-2">
              {canRegister && !isRegistered && upcoming && event.status === 'PUBLISHED' && (
                <Button size="sm" onClick={() => onRegister?.(event)}>Register</Button>
              )}
              {editTo && (
                <Link
                  to={editTo}
                  className="inline-flex min-h-9 items-center rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  Edit
                </Link>
              )}
              {onViewParticipants && (
                <Button size="sm" variant="outline" onClick={() => onViewParticipants(event)}>
                  View participants
                </Button>
              )}
              {onDelete && (
                <Button size="sm" variant="outline" onClick={() => onDelete(event)}>
                  Delete
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
    </article>
  )
}

export default EventCard
