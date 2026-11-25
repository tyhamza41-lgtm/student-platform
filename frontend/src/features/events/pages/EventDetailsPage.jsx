import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { Alert, Badge, Button, Card, ConfirmDialog } from '../../../components/ui'
import { ROUTES } from '../../../constants/routes'
import { USER_ROLES } from '../../../constants/roles'
import { useAuth } from '../../../context/AuthContext'
import { formatDate } from '../../../utils/formatDate'
import * as eventsService from '../events.service'
import EventRegistrationDialog from '../components/EventRegistrationDialog'

const pageLoadedAt = Date.now()

function EventDetailsPage() {
  const { eventId } = useParams()
  const { currentUser } = useAuth()
  const location = useLocation()
  const [event, setEvent] = useState(null)
  const [isRegistered, setIsRegistered] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [loading, setLoading] = useState(true)
  const [savingCancel, setSavingCancel] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(location.state?.successMessage || '')
  const [reload, setReload] = useState(0)
  const canParticipate = currentUser?.role === USER_ROLES.STUDENT && currentUser.isActive !== false

  useEffect(() => {
    let active = true
    async function loadEvent() {
      try {
        const [record, registrations] = await Promise.all([
          eventsService.getById(eventId),
          canParticipate ? eventsService.getMyRegistrations(currentUser.id) : Promise.resolve([]),
        ])
        if (!active) return
        if (!record) {
          setError('This event could not be found.')
          return
        }
        setEvent(record)
        setIsRegistered(registrations.some((registration) => registration.eventId === eventId))
        setError('')
      } catch (loadError) {
        if (active) setError(loadError.message || 'This event could not be loaded.')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadEvent()
    return () => { active = false }
  }, [canParticipate, currentUser?.id, eventId, reload])

  async function handleCancelRegistration() {
    if (!event || !canParticipate) return
    setSavingCancel(true)
    setError('')
    try {
      await eventsService.cancelRegistration(event.id, currentUser.id)
      setEvent(await eventsService.getById(event.id))
      setIsRegistered(false)
      setSuccess('Your event registration has been cancelled.')
      setConfirmCancel(false)
    } catch (cancelError) {
      setError(cancelError.message || 'Your registration could not be cancelled.')
      setConfirmCancel(false)
    } finally {
      setSavingCancel(false)
    }
  }

  function handleRegistered(updatedEvent) {
    setEvent(updatedEvent)
    setIsRegistered(true)
    setSuccess('Your registration has been confirmed.')
  }

  const isUpcoming = event && new Date(event.date).getTime() > pageLoadedAt

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link
        to={ROUTES.EVENTS}
        className="inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        ← All events
      </Link>

      {loading ? (
        <Card role="status" className="text-sm text-slate-500">Loading event…</Card>
      ) : error && !event ? (
        <Alert
          variant="danger"
          title="Event unavailable"
          action={<Button size="sm" variant="outline" onClick={() => {
            setLoading(true)
            setError('')
            setReload((count) => count + 1)
          }}>Try again</Button>}
        >
          {error}
        </Alert>
      ) : event && (
        <>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}
          <Card padding="none" className="overflow-hidden rounded-2xl">
            {event.imageUrl && (
              <img src={event.imageUrl} alt="" className="max-h-[28rem] w-full bg-slate-100 object-cover" />
            )}
            <div className="space-y-6 p-5 sm:p-8">
              <header>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={event.status === 'CANCELLED' ? 'danger' : isUpcoming ? 'success' : 'default'}>
                    {event.status === 'CANCELLED' ? 'Cancelled' : isUpcoming ? 'Upcoming' : 'Past event'}
                  </Badge>
                  {isRegistered && <Badge variant="success">You’re registered</Badge>}
                </div>
                <p className="mt-4 text-sm font-semibold text-indigo-600">{event.organizer || 'Campus event'}</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{event.title}</h1>
              </header>

              <dl className="grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-3">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Date &amp; time</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-800">
                    {formatDate(event.date, { weekday: 'long', hour: '2-digit', minute: '2-digit' })}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Location</dt>
                  <dd className="mt-1 break-words text-sm font-semibold text-slate-800">{event.location}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Participants</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-800">{event.participantCount ?? 0}</dd>
                </div>
              </dl>

              <section aria-labelledby="event-description-heading">
                <h2 id="event-description-heading" className="text-base font-bold text-slate-900">About this event</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">{event.description}</p>
              </section>

              {canParticipate && isUpcoming && event.status === 'PUBLISHED' && (
                <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center">
                  {isRegistered ? (
                    <Button variant="outline" onClick={() => setConfirmCancel(true)}>
                      Cancel participation
                    </Button>
                  ) : (
                    <Button onClick={() => setSelectedEvent(event)}>Register for this event</Button>
                  )}
                  <p className="text-xs text-slate-500">A valid phone number is required to complete registration.</p>
                </div>
              )}
            </div>
          </Card>
        </>
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
        isOpen={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={handleCancelRegistration}
        title="Cancel event registration?"
        message={`You will lose your place for ${event?.title || 'this event'}.`}
        confirmText="Cancel registration"
        isLoading={savingCancel}
        variant="warning"
      />
    </div>
  )
}

export default EventDetailsPage
