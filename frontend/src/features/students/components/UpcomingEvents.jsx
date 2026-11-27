import { useEffect, useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { Avatar, Badge, Button, Card } from '../../../components/ui'
import { Link } from 'react-router'
import { ROUTES } from '../../../constants/routes'
import { USER_ROLES } from '../../../constants/roles'
import * as usersService from '../../users/users.service'
import EventRegistrationDialog from '../../events/components/EventRegistrationDialog'
import { formatDate } from '../../../utils/formatDate'

const dashboardLoadedAt = Date.now()

function UpcomingEvents({
  events = [],
  registeredEventIds = new Set(),
  onEventRegistered,
  layout = 'stacked',
}) {
  const { currentUser } = useAuth()
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [users, setUsers] = useState([])
  const [usersError, setUsersError] = useState('')

  useEffect(() => {
    let active = true
    usersService.getAll()
      .then((records) => {
        if (active) setUsers(records)
      })
      .catch((error) => {
        if (active) setUsersError(error.message || 'Participant profiles could not be loaded.')
      })
    return () => { active = false }
  }, [])

  const eventListClassName = layout === 'wide'
    ? 'grid min-w-0 gap-4 sm:grid-cols-2'
    : 'min-w-0 space-y-4'

  if (events.length === 0) return null

  return (
    <>
      <Card
        padding="sm"
        aria-labelledby="upcoming-events-heading"
        className="rounded-2xl border-slate-200/75 p-5 shadow-[0_6px_18px_rgba(15,23,42,0.025)]"
      >
        <Card.Header className="pb-4">
          <Card.Title id="upcoming-events-heading" className="text-base">Upcoming events</Card.Title>
        </Card.Header>

        <div className={eventListClassName}>
          {events.map((event) => {
            const isRegistered = registeredEventIds.has(event.id)
            const participants = (event.participantAvatarIds || [])
              .map((avatarId) => users.find((user) => user.id === avatarId))
              .filter(Boolean)

            if (
              isRegistered &&
              currentUser &&
              !participants.some((participant) => participant.id === currentUser.id)
            ) {
              participants.unshift(currentUser)
            }

            return (
              <article
                key={event.id}
                className="flex min-w-0 flex-col rounded-xl border border-slate-300 bg-slate-50/70 p-4 "
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold leading-5 text-slate-900">{event.title}</h3>
                    <p className="mt-0.5 text-xs text-slate-500">{event.organizer}</p>
                  </div>
                  {isRegistered && (
                    <Badge variant="success" size="xs" className="shrink-0">
                      Registered
                    </Badge>
                  )}
                </div>

                <dl className="mt-4 grid min-w-0 grid-cols-1 gap-3 text-xs text-slate-600 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="min-w-0">
                    <dt className="text-slate-400">Date &amp; time</dt>
                    <dd className="mt-1 break-words font-semibold text-slate-700">
                      {formatDate(event.date, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-slate-400">Location</dt>
                    <dd className="mt-1 break-words font-semibold text-slate-700">{event.location}</dd>
                  </div>
                </dl>

                <p className="mt-4 text-xs leading-6 text-slate-600">{event.description}</p>
                {usersError && (
                  <p role="alert" className="mt-3 text-xs text-red-700">{usersError}</p>
                )}

                <div className="mt-4 border-t border-slate-200/70 pt-3.5">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
                    <div
                      role="group"
                        aria-label={`${event.participantCount ?? 0} event participant${event.participantCount === 1 ? '' : 's'}`}
                      className="flex shrink-0 items-center -space-x-2"
                    >
                      {participants.slice(0, 4).map((participant) => (
                        <Link
                          key={participant.id}
                          to={ROUTES.USER_PROFILE(participant.id)}
                          aria-label={`View ${participant.name}'s profile`}
                          className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        >
                          <Avatar
                            src={participant.avatarUrl}
                            name={participant.name}
                            alt={`${participant.name}, event participant`}
                            size="sm"
                            className="ring-2 ring-white"
                          />
                        </Link>
                      ))}
                    </div>
                    <p className="min-w-0 text-xs font-semibold text-slate-600">
                      {event.participantCount ?? 0} {event.participantCount === 1 ? 'participant' : 'participants'}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <Link
                      to={ROUTES.EVENT_DETAILS(event.id)}
                      className="inline-flex min-h-9 items-center rounded-lg px-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                      Event details
                    </Link>
                    {isRegistered ? (
                      <p className="text-xs font-medium text-emerald-700" role="status">You’re registered</p>
                    ) : currentUser?.role === USER_ROLES.STUDENT && currentUser.isActive !== false &&
                      event.status !== 'CANCELLED' && new Date(event.date).getTime() > dashboardLoadedAt ? (
                      <Button
                        variant="primary"
                        size="sm"
                        className="h-9"
                        onClick={() => setSelectedEvent(event)}
                      >
                        Participate
                      </Button>
                    ) : null}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </Card>

      {selectedEvent && (
        <EventRegistrationDialog
          event={selectedEvent}
          userId={currentUser.id}
          onClose={() => setSelectedEvent(null)}
          onRegistered={(updatedEvent) => onEventRegistered?.(updatedEvent)}
        />
      )}
    </>
  )
}

export default UpcomingEvents
