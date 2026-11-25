import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Alert, Button, Card, ConfirmDialog, EmptyState } from '../../../components/ui'
import { ROUTES } from '../../../constants/routes'
import { USER_ROLES } from '../../../constants/roles'
import { useAuth } from '../../../context/AuthContext'
import * as eventsService from '../events.service'
import EventCard from '../components/EventCard'
import EventRegistrationDialog from '../components/EventRegistrationDialog'

const pageLoadedAt = Date.now()

function EventsListPage() {
  const { currentUser } = useAuth()
  const [events, setEvents] = useState([])
  const [registeredEventIds, setRegisteredEventIds] = useState(new Set())
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [eventToDelete, setEventToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletionError, setDeletionError] = useState('')
  const [reload, setReload] = useState(0)
  const canParticipate = currentUser?.role === USER_ROLES.STUDENT && currentUser.isActive !== false
  const canModerate = currentUser?.role === USER_ROLES.DIRECTOR && currentUser.isActive !== false

  useEffect(() => {
    let active = true
    async function loadEvents() {
      try {
        const [records, registrations] = await Promise.all([
          eventsService.getAll(canModerate ? {} : { status: 'PUBLISHED' }),
          canParticipate ? eventsService.getMyRegistrations(currentUser.id) : Promise.resolve([]),
        ])
        if (!active) return
        setEvents(records)
        setRegisteredEventIds(new Set(registrations.map((registration) => registration.eventId)))
        setError('')
      } catch (loadError) {
        if (active) setError(loadError.message || 'Events could not be loaded.')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadEvents()
    return () => { active = false }
  }, [canModerate, canParticipate, currentUser?.id, reload])

  function handleRegistered(updatedEvent) {
    setEvents((current) => current.map((event) => (
      event.id === updatedEvent.id ? updatedEvent : event
    )))
    setRegisteredEventIds((current) => new Set(current).add(updatedEvent.id))
  }

  async function handleDeleteEvent() {
    if (!eventToDelete || !canModerate) return
    setDeleting(true)
    setDeletionError('')
    try {
      await eventsService.deleteEvent(eventToDelete.id, currentUser.id)
      setEvents((current) => current.filter((event) => event.id !== eventToDelete.id))
      setRegisteredEventIds((current) => {
        const updated = new Set(current)
        updated.delete(eventToDelete.id)
        return updated
      })
      setEventToDelete(null)
    } catch (deleteError) {
      setDeletionError(deleteError.message || 'This event could not be deleted.')
      setEventToDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  const upcomingEvents = events
    .filter((event) => event.status === 'PUBLISHED' && new Date(event.date).getTime() >= pageLoadedAt)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
  const pastEvents = events
    .filter((event) => event.status === 'PUBLISHED' && new Date(event.date).getTime() < pageLoadedAt)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
  const cancelledEvents = canModerate
    ? events.filter((event) => event.status === 'CANCELLED')
    : []

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-600">Campus community</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Events</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Discover upcoming activities and revisit events from across campus.
          </p>
        </div>
        {currentUser?.role === USER_ROLES.ASSOCIATION && (
          <Link
            to={ROUTES.ASSOCIATION.CREATE_EVENT}
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            Create event
          </Link>
        )}
      </header>

      {error && (
        <Alert
          variant="danger"
          title="Events unavailable"
          action={<Button size="sm" variant="outline" onClick={() => {
            setLoading(true)
            setReload((count) => count + 1)
          }}>Try again</Button>}
        >
          {error}
        </Alert>
      )}
      {deletionError && (
        <Alert variant="danger" title="Event could not be deleted">
          {deletionError}
        </Alert>
      )}

      {loading ? (
        <Card role="status" className="text-sm text-slate-500">Loading events…</Card>
      ) : !error && events.length === 0 ? (
        <EmptyState
          title="No events yet"
          description="Campus events will appear here when they are published."
        />
      ) : !error && (
        <div className="space-y-8">
          <section aria-labelledby="upcoming-events-heading" className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 id="upcoming-events-heading" className="text-lg font-bold text-slate-900">Upcoming events</h2>
              <span className="text-sm text-slate-500">{upcomingEvents.length} events</span>
            </div>
            {upcomingEvents.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {upcomingEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    isRegistered={registeredEventIds.has(event.id)}
                    canRegister={canParticipate}
                    onRegister={setSelectedEvent}
                    onDelete={canModerate ? setEventToDelete : undefined}
                  />
                ))}
              </div>
            ) : (
              <Card className="text-sm text-slate-500">There are no upcoming events right now.</Card>
            )}
          </section>

          <section aria-labelledby="past-events-heading" className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 id="past-events-heading" className="text-lg font-bold text-slate-900">Past events</h2>
              <span className="text-sm text-slate-500">{pastEvents.length} events</span>
            </div>
            {pastEvents.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {pastEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onDelete={canModerate ? setEventToDelete : undefined}
                  />
                ))}
              </div>
            ) : (
              <Card className="text-sm text-slate-500">Past events will appear here after they take place.</Card>
            )}
          </section>

          {cancelledEvents.length > 0 && (
            <section aria-labelledby="cancelled-events-heading" className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 id="cancelled-events-heading" className="text-lg font-bold text-slate-900">
                  Cancelled events
                </h2>
                <span className="text-sm text-slate-500">{cancelledEvents.length} events</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {cancelledEvents.map((event) => (
                  <EventCard key={event.id} event={event} onDelete={setEventToDelete} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {selectedEvent && (
        <EventRegistrationDialog
          event={selectedEvent}
          userId={currentUser.id}
          onClose={() => setSelectedEvent(null)}
          onRegistered={handleRegistered}
        />
      )}
      <ConfirmDialog
        isOpen={Boolean(eventToDelete)}
        onClose={() => setEventToDelete(null)}
        onConfirm={handleDeleteEvent}
        title="Delete this event?"
        message={eventToDelete
          ? `Delete “${eventToDelete.title}”? This permanently removes its registrations and sends a notice to all platform users.`
          : ''}
        confirmText="Delete event"
        isLoading={deleting}
      />
    </div>
  )
}

export default EventsListPage
