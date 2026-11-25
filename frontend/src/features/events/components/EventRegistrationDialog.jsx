import { useRef, useState } from 'react'
import { Alert, Button, FormField, Input, Modal, Textarea } from '../../../components/ui'
import * as eventsService from '../events.service'

function isValidPhoneNumber(value) {
  const phone = value.trim()
  const digits = phone.replace(/\D/g, '')
  return /^\+?[\d\s().-]+$/.test(phone) && digits.length >= 7 && digits.length <= 15
}

function EventRegistrationDialog({ event, userId, onClose, onRegistered }) {
  const phoneInputRef = useRef(null)
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [registeredEvent, setRegisteredEvent] = useState(null)

  async function handleSubmit(submitEvent) {
    submitEvent.preventDefault()
    setError('')
    if (!phone.trim()) {
      setError('Enter your phone number to register.')
      phoneInputRef.current?.focus()
      return
    }
    if (!isValidPhoneNumber(phone)) {
      setError('Enter a valid phone number with 7 to 15 digits.')
      phoneInputRef.current?.focus()
      return
    }

    setSaving(true)
    try {
      await eventsService.register(event.id, userId, {
        phone: phone.trim(),
        message: message.trim(),
      })
      const updatedEvent = await eventsService.getById(event.id)
      setRegisteredEvent(updatedEvent)
      onRegistered?.(updatedEvent)
    } catch (registrationError) {
      setError(registrationError.message || 'Your registration could not be completed.')
    } finally {
      setSaving(false)
    }
  }

  function handleClose() {
    if (!saving) onClose()
  }

  return (
    <Modal
      isOpen={Boolean(event)}
      onClose={saving ? undefined : handleClose}
      title={registeredEvent ? 'Registration confirmed' : `Register for ${event?.title ?? 'event'}`}
      description={registeredEvent ? undefined : 'Share your phone number with the event organizer.'}
      initialFocusRef={phoneInputRef}
      className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
    >
      {registeredEvent ? (
        <div className="space-y-5">
          <div role="status" aria-live="polite" className="rounded-xl bg-emerald-50 p-4">
            <p className="font-semibold text-emerald-800">
              You’re registered for {registeredEvent.title}.
            </p>
            <p className="mt-1 text-sm text-emerald-700">
              The event now has {registeredEvent.participantCount} participants.
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleClose}>Done</Button>
          </div>
        </div>
      ) : (
        <form noValidate onSubmit={handleSubmit} className="space-y-5">
          {error && <Alert variant="danger">{error}</Alert>}
          <FormField
            label="Phone number"
            required
            helperText="Used by the organizer to coordinate this event."
          >
            <Input
              ref={phoneInputRef}
              type="tel"
              name="phone"
              autoComplete="tel"
              inputMode="tel"
              placeholder="+212 6 12 34 56 78"
              value={phone}
              onChange={(inputEvent) => setPhone(inputEvent.target.value)}
              required
            />
          </FormField>
          <FormField label="Message (optional)" helperText="Add a short note for the organizer, if needed.">
            <Textarea
              name="message"
              rows={3}
              maxLength={280}
              placeholder="Anything the organizer should know?"
              value={message}
              onChange={(inputEvent) => setMessage(inputEvent.target.value)}
            />
          </FormField>
          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={handleClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Registering…' : 'Confirm registration'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}

export default EventRegistrationDialog
