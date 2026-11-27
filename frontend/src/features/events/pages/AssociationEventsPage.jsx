import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import {
  Alert,
  Avatar,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Modal,
} from '../../../components/ui'
import { ROUTES } from '../../../constants/routes'
import { USER_ROLES } from '../../../constants/roles'
import { useAuth } from '../../../context/AuthContext'
import * as eventsService from '../events.service'
import EventCard from '../components/EventCard'

function AssociationEventsPage() {
  const { currentUser } = useAuth()
  const associationId = currentUser?.associationId || currentUser?.id
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [eventToDelete, setEventToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [participantsEvent, setParticipantsEvent] = useState(null)
  const [participants, setParticipants] = useState([])
  const [participantsLoading, setParticipantsLoading] = useState(false)
  const [participantsError, setParticipantsError] = useState('')

  useEffect(() => {
    let active = true
    eventsService.getAll({ ownerType: USER_ROLES.ASSOCIATION, ownerId: associationId })
      .then((records) => {
        if (active) {
          setEvents(records.sort((a, b) => new Date(b.date) - new Date(a.date)))
          setError('')
        }
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || 'Your events could not be loaded.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [associationId, reload])

  async function loadParticipants(event) {
    setParticipantsEvent(event)
    setParticipants([])
    setParticipantsError('')
    setParticipantsLoading(true)
    try {
      const registrations = await eventsService.getRegistrations(event.id, currentUser.id)
      setParticipants(registrations)
    } catch (loadError) {
      setParticipantsError(loadError.message || 'Participants could not be loaded.')
    } finally {
      setParticipantsLoading(false)
    }
  }

  async function deleteEvent() {
    if (!eventToDelete) return
    setDeleting(true)
    setError('')
    try {
      await eventsService.deleteEvent(eventToDelete.id, currentUser.id)
      setEvents((current) => current.filter((event) => event.id !== eventToDelete.id))
      setEventToDelete(null)
    } catch (deleteError) {
      setError(deleteError.message || 'This event could not be deleted.')
      setEventToDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-600">Association workspace</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Manage Events</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Create and manage your events, and see who has registered.
          </p>
        </div>
        <Link
          to={ROUTES.ASSOCIATION.CREATE_EVENT}
          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          Create event
        </Link>
      </header>

      {error && (
        <Alert
          variant="danger"
          title="Event management update"
          action={<Button size="sm" variant="outline" onClick={() => {
            setLoading(true)
            setReload((count) => count + 1)
          }}>Reload events</Button>}
        >
          {error}
        </Alert>
      )}
      {loading ? (
        <Card role="status" className="text-sm text-slate-500">Loading your events…</Card>
      ) : !error && events.length === 0 ? (
        <Card>
          <EmptyState
            title="No events published yet"
            description="Create your first event to share it with the campus community."
            action={(
              <Link
                to={ROUTES.ASSOCIATION.CREATE_EVENT}
                className="inline-flex h-10 items-center rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                Create event
              </Link>
            )}
          />
        </Card>
      ) : !error && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              editTo={ROUTES.ASSOCIATION.EDIT_EVENT(event.id)}
              onDelete={setEventToDelete}
              onViewParticipants={loadParticipants}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(eventToDelete)}
        onClose={() => setEventToDelete(null)}
        onConfirm={deleteEvent}
        title="Delete this event?"
        message={eventToDelete
          ? `Delete “${eventToDelete.title}”? This permanently removes the event and its registrations, and sends a notice to all platform users.`
          : ''}
        confirmText="Delete event"
        isLoading={deleting}
      />

      <Modal
        isOpen={Boolean(participantsEvent)}
        onClose={() => setParticipantsEvent(null)}
        title={`Participants${participantsEvent ? ` — ${participantsEvent.title}` : ''}`}
        description="People registered for your event."
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
      >
        {participantsLoading ? (
          <p role="status" className="text-sm text-slate-500">Loading participants…</p>
        ) : participantsError ? (
          <Alert variant="danger">{participantsError}</Alert>
        ) : participants.length === 0 ? (
          <EmptyState title="No participants yet" description="Registrations will appear here." />
        ) : (
          <ul className="space-y-3">
            {participants.map((registration) => {
              const participant = registration.participant
              const participantName = participant?.name || 'Student'
              const phone = typeof registration.phone === 'string' && registration.phone.trim()
                ? registration.phone
                : 'Not provided'
              const message = typeof registration.message === 'string' && registration.message.trim()
                ? registration.message
                : 'No message provided'

              return (
                <li
                  key={registration.id}
                  className="rounded-xl border border-slate-200 p-4 sm:p-5"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    {participant?.id ? (
                      <Link
                        to={ROUTES.USER_PROFILE(participant.id)}
                        aria-label={`View ${participantName}'s profile`}
                        onClick={() => setParticipantsEvent(null)}
                        className="shrink-0"
                      >
                        <Avatar
                          src={participant.avatarUrl}
                          name={participantName}
                          alt={`${participantName} profile`}
                          size="md"
                        />
                      </Link>
                    ) : (
                      <Avatar src={null} name={participantName} alt="" size="md" />
                    )}
                    <div className="min-w-0 flex-1">
                      {participant?.id ? (
                        <Link
                          to={ROUTES.USER_PROFILE(participant.id)}
                          onClick={() => setParticipantsEvent(null)}
                          className="font-semibold text-slate-800 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        >
                          {participantName}
                        </Link>
                      ) : (
                        <p className="font-semibold text-slate-800">{participantName}</p>
                      )}
                      {participant?.classGroup?.name && (
                        <p className="mt-1 text-sm text-slate-500">
                          {participant.classGroup.name}
                        </p>
                      )}
                      {participant?.bio && (
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600">
                          {participant.bio}
                        </p>
                      )}
                    </div>
                  </div>
                  <dl className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
                    <div className="min-w-0">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Registration phone
                      </dt>
                      <dd className="mt-1 break-words text-sm text-slate-800">{phone}</dd>
                    </div>
                    <div className="min-w-0 sm:col-span-2">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Registration message
                      </dt>
                      <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-800">
                        {message}
                      </dd>
                    </div>
                  </dl>
                </li>
              )
            })}
          </ul>
        )}
      </Modal>
    </div>
  )
}

export default AssociationEventsPage
