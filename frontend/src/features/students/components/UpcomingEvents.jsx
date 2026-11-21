import { useRef, useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { Avatar, Badge, Button, Card, FormField, Input, Modal, Textarea } from '../../../components/ui'
import { events as mockEvents } from '../../../mocks/data/events'
import { users as mockUsers } from '../../../mocks/data/users'
import { formatDate } from '../../../utils/formatDate'

function isValidPhoneNumber(value) {
  const phone = value.trim()
  const digits = phone.replace(/\D/g, '')
  return /^\+?[\d\s().-]+$/.test(phone) && digits.length >= 7 && digits.length <= 15
}

function UpcomingEvents({
  events = mockEvents,
  registeredEventIds = new Set(),
  onRegister,
  layout = 'stacked',
}) {
  const { currentUser } = useAuth()
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const phoneInputRef = useRef(null)

  if (events.length === 0) return null

  function openRegistration(event) {
    setSelectedEvent(event)
    setPhone('')
    setMessage('')
    setPhoneError('')
    setHasSubmitted(false)
  }

  function closeRegistration() {
    if (isSubmitting) return
    setSelectedEvent(null)
    setPhone('')
    setMessage('')
    setPhoneError('')
    setHasSubmitted(false)
  }

  async function submitRegistration(event) {
    event.preventDefault()

    if (!selectedEvent || registeredEventIds.has(selectedEvent.id)) return

    if (!phone.trim()) {
      setPhoneError('Enter your phone number to register.')
      phoneInputRef.current?.focus()
      return
    }

    if (!isValidPhoneNumber(phone)) {
      setPhoneError('Enter a valid phone number with 7 to 15 digits.')
      phoneInputRef.current?.focus()
      return
    }

    setPhoneError('')
    setIsSubmitting(true)
    await new Promise((resolve) => window.setTimeout(resolve, 150))
    onRegister?.(selectedEvent.id, {
      phone: phone.trim(),
      message: message.trim(),
    })
    setIsSubmitting(false)
    setHasSubmitted(true)
  }

  const eventListClassName = layout === 'wide'
    ? 'grid min-w-0 gap-4 sm:grid-cols-2'
    : 'min-w-0 space-y-4'

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
            const participantCount = event.participantCount +
              (isRegistered && !event.initiallyParticipating ? 1 : 0)
            const participants = (event.participantAvatarIds || [])
              .map((avatarId) => mockUsers.find((user) => user.id === avatarId))
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
                className="flex min-w-0 flex-col rounded-xl border border-slate-100 bg-slate-50/70 p-4"
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

                <div className="mt-4 border-t border-slate-200/70 pt-3.5">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
                    <div
                      role="group"
                      aria-label={`${participantCount} event participants`}
                      className="flex shrink-0 items-center -space-x-2"
                    >
                      {participants.slice(0, 4).map((participant) => (
                        <Avatar
                          key={participant.id}
                          src={participant.avatarUrl}
                          name={participant.name}
                          alt={`${participant.name}, event participant`}
                          size="sm"
                          className="ring-2 ring-white"
                        />
                      ))}
                    </div>
                    <p className="min-w-0 text-xs font-semibold text-slate-600">
                      {participantCount} participants
                    </p>
                  </div>

                  <div className="mt-3 flex justify-end">
                    {isRegistered ? (
                      <p className="text-xs font-medium text-emerald-700" role="status">
                        You’re registered
                      </p>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        className="h-9"
                        onClick={() => openRegistration(event)}
                      >
                        Participate
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </Card>

      <Modal
        isOpen={Boolean(selectedEvent)}
        onClose={isSubmitting ? undefined : closeRegistration}
        title={hasSubmitted ? 'Registration confirmed' : `Register for ${selectedEvent?.title ?? 'event'}`}
        description={hasSubmitted ? undefined : 'Share your phone number with the event organizer.'}
        initialFocusRef={phoneInputRef}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
      >
        {selectedEvent && (
          hasSubmitted ? (
            <div className="space-y-5">
              <div role="status" aria-live="polite" className="rounded-xl bg-emerald-50 p-4">
                <p className="font-semibold text-emerald-800">
                  You’re registered for {selectedEvent.title}.
                </p>
                <p className="mt-1 text-sm leading-5 text-emerald-700">
                  The event participant count has been updated.
                </p>
              </div>
              <div className="flex justify-end">
                <Button onClick={closeRegistration}>Done</Button>
              </div>
            </div>
          ) : (
            <form noValidate onSubmit={submitRegistration} className="space-y-5">
              <FormField
                label="Phone number"
                required
                error={phoneError}
                helperText={phoneError ? undefined : 'Used by the organizer to coordinate this event.'}
              >
                <Input
                  ref={phoneInputRef}
                  type="tel"
                  name="phone"
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="+212 6 12 34 56 78"
                  value={phone}
                  onChange={(event) => {
                    setPhone(event.target.value)
                    setPhoneError('')
                  }}
                  required
                />
              </FormField>

              <FormField
                label="Message (optional)"
                helperText="Add a short note for the organizer, if needed."
              >
                <Textarea
                  name="message"
                  rows={3}
                  maxLength={280}
                  placeholder="Anything the organizer should know?"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                />
              </FormField>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  onClick={closeRegistration}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Registering…' : 'Confirm registration'}
                </Button>
              </div>
            </form>
          )
        )}
      </Modal>
    </>
  )
}

export default UpcomingEvents
