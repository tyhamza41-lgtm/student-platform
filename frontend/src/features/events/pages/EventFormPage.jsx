import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Alert, Button, Card, FileUpload, FormField, Input, Textarea } from '../../../components/ui'
import { ROUTES } from '../../../constants/routes'
import { USER_ROLES } from '../../../constants/roles'
import { useAuth } from '../../../context/AuthContext'
import * as eventsService from '../events.service'

const MAX_IMAGE_SIZE = 2 * 1024 * 1024

function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('The selected image could not be read.'))
    reader.readAsDataURL(file)
  })
}

function getLocalDateTimeMinimum() {
  const date = new Date(Date.now() + 60_000)
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

function EventFormPage() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const isEditing = Boolean(eventId)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [location, setLocation] = useState('')
  const [imageUrl, setImageUrl] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [permissionDenied, setPermissionDenied] = useState(false)
  const associationId = currentUser?.associationId || currentUser?.id

  useEffect(() => {
    if (!isEditing) return undefined
    let active = true
    async function loadEvent() {
      try {
        const event = await eventsService.getById(eventId)
        if (!active) return
        if (!event) {
          setError('This event could not be found.')
          return
        }
        if (
          currentUser?.role !== USER_ROLES.ASSOCIATION ||
          event.ownerType !== USER_ROLES.ASSOCIATION ||
          event.ownerId !== associationId
        ) {
          setPermissionDenied(true)
          setError('You can only edit events published by your association.')
          return
        }
        setTitle(event.title)
        setDescription(event.description)
        setDate(event.date.slice(0, 16))
        setLocation(event.location)
        setImageUrl(event.imageUrl || null)
        setImagePreview(event.imageUrl || '')
      } catch (loadError) {
        if (active) setError(loadError.message || 'This event could not be loaded.')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadEvent()
    return () => { active = false }
  }, [associationId, currentUser?.role, eventId, isEditing])

  async function handleImageChange(files) {
    const file = files[0] || null
    setImageFile(file)
    setError('')
    if (!file) {
      setImagePreview(imageUrl || '')
      return
    }
    try {
      setImagePreview(await readImage(file))
    } catch (readError) {
      setImageFile(null)
      setImagePreview(imageUrl || '')
      setError(readError.message)
    }
  }

  async function handleSubmit(submitEvent) {
    submitEvent.preventDefault()
    setError('')
    if (!title.trim() || !description.trim() || !date || !location.trim()) {
      setError('Complete the title, description, date and time, and location fields.')
      return
    }
    if (Number.isNaN(new Date(date).getTime()) || new Date(date).getTime() <= Date.now()) {
      setError('Choose a valid date and time in the future.')
      return
    }
    if (currentUser?.role !== USER_ROLES.ASSOCIATION || currentUser.isActive === false) {
      setError('Only an active Association account can manage events.')
      return
    }

    setSaving(true)
    try {
      const nextImageUrl = imageFile ? await readImage(imageFile) : imageUrl
      const data = {
        title: title.trim(),
        description: description.trim(),
        date,
        location: location.trim(),
        imageUrl: nextImageUrl || null,
      }
      const savedEvent = isEditing
        ? await eventsService.update(eventId, data, currentUser.id)
        : await eventsService.create(data, currentUser.id)
      navigate(ROUTES.EVENT_DETAILS(savedEvent.id), {
        replace: true,
        state: { successMessage: isEditing ? 'Your event has been updated.' : 'Your event has been published.' },
      })
    } catch (saveError) {
      setError(saveError.message || 'Your event could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  if (currentUser?.role !== USER_ROLES.ASSOCIATION) {
    return (
      <div className="mx-auto max-w-3xl">
        <Alert variant="danger" title="Event management unavailable">
          Only Association accounts can create or edit events.
        </Alert>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-600">Association events</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
          {isEditing ? 'Edit Event' : 'Create Event'}
        </h1>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          {isEditing ? 'Update the details for your campus event.' : 'Publish an activity for the campus community.'}
        </p>
      </header>

      {loading ? (
        <Card role="status" className="text-sm text-slate-500">Loading event…</Card>
      ) : permissionDenied || (error && isEditing) ? (
        <Alert variant="danger" title="Event unavailable">{error}</Alert>
      ) : (
        <Card padding="lg">
          {error && <Alert variant="danger" className="mb-5">{error}</Alert>}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <FormField label="Event title" required>
              <Input
                name="title"
                maxLength={180}
                value={title}
                onChange={(inputEvent) => setTitle(inputEvent.target.value)}
                placeholder="Give your event a clear title"
                required
              />
            </FormField>
            <FormField label="Description" required helperText={`${description.length}/5000 characters`}>
              <Textarea
                name="description"
                rows={6}
                maxLength={5000}
                value={description}
                onChange={(inputEvent) => setDescription(inputEvent.target.value)}
                placeholder="What should participants know?"
                required
              />
            </FormField>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Date and time" required>
                <Input
                  type="datetime-local"
                  name="date"
                  min={getLocalDateTimeMinimum()}
                  value={date}
                  onChange={(inputEvent) => setDate(inputEvent.target.value)}
                  required
                />
              </FormField>
              <FormField label="Location" required>
                <Input
                  name="location"
                  maxLength={240}
                  value={location}
                  onChange={(inputEvent) => setLocation(inputEvent.target.value)}
                  placeholder="Building, room, or meeting point"
                  required
                />
              </FormField>
            </div>
            <FileUpload
              label="Event image (optional)"
              accept="image/*"
              maxSize={MAX_IMAGE_SIZE}
              files={imageFile ? [imageFile] : []}
              onChange={handleImageChange}
              helperText="PNG, JPG, GIF, or WebP up to 2 MB."
            />
            {imagePreview && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Image preview</p>
                <img
                  src={imagePreview}
                  alt="Preview of the event"
                  className="max-h-80 w-full rounded-xl border border-slate-200 object-contain"
                />
                {!imageFile && imageUrl && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setImageUrl(null)
                      setImagePreview('')
                    }}
                  >
                    Remove current image
                  </Button>
                )}
              </div>
            )}
            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <Link
                to={ROUTES.ASSOCIATION.MY_EVENTS}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                Cancel
              </Link>
              <Button type="submit" isLoading={saving}>
                {isEditing ? 'Save changes' : 'Publish event'}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  )
}

export default EventFormPage
