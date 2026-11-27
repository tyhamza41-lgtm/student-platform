import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Card, FormField, Input, Textarea } from '../../../components/ui'
import { useAuth } from '../../../context/AuthContext'
import * as profilesService from '../profiles.service'
import ProfileDetails from './ProfileDetails'

const MAX_PROFILE_IMAGE_SIZE = 2 * 1024 * 1024
const PROFILE_IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
const PROFILE_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp'])

function getEditableValues(profile) {
  return {
    name: profile.name || '',
    bio: profile.bio || '',
    phone: profile.phone || '',
  }
}

function readImageAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('The selected image could not be read. Choose another image.'))
    }
    reader.onerror = () => reject(new Error('The selected image could not be read. Choose another image.'))
    reader.readAsDataURL(file)
  })
}

async function createProfilePhoto(file) {
  const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
  if (
    !PROFILE_IMAGE_EXTENSIONS.has(extension) ||
    (file.type && !PROFILE_IMAGE_TYPES.has(file.type))
  ) {
    throw new Error('Choose a JPG, PNG, or WEBP image.')
  }
  if (file.size > MAX_PROFILE_IMAGE_SIZE) {
    throw new Error('The image must be 2 MB or smaller.')
  }

  const source = await readImageAsDataUrl(file)
  const image = new Image()
  await new Promise((resolve, reject) => {
    image.onload = resolve
    image.onerror = () => reject(new Error('The selected image could not be read. Choose another image.'))
    image.src = source
  })

  if (!image.naturalWidth || !image.naturalHeight) {
    throw new Error('The selected image could not be read. Choose another image.')
  }

  const canvas = document.createElement('canvas')
  canvas.width = 400
  canvas.height = 400
  const context = canvas.getContext('2d')
  if (!context) throw new Error('The selected image could not be processed. Choose another image.')

  try {
    context.fillStyle = '#fff'
    context.fillRect(0, 0, 400, 400)
    const scale = Math.max(400 / image.naturalWidth, 400 / image.naturalHeight)
    const width = image.naturalWidth * scale
    const height = image.naturalHeight * scale
    context.drawImage(image, (400 - width) / 2, (400 - height) / 2, width, height)
    return canvas.toDataURL('image/jpeg', 0.8)
  } catch {
    throw new Error('The selected image could not be processed. Choose another image.')
  }
}

function ProfilePage() {
  const { currentUser, setCurrentUser } = useAuth()
  const photoInputRef = useRef(null)
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({ name: '', bio: '', phone: '' })
  const [photoPreview, setPhotoPreview] = useState(null)
  const [photoError, setPhotoError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [processingPhoto, setProcessingPhoto] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let active = true

    async function loadProfile() {
      setLoading(true)
      setError('')
      try {
        const record = await profilesService.getOwnProfile(currentUser.id, currentUser.id)
        if (!record) {
          if (active) setError('Your profile could not be found.')
          return
        }
        if (active) {
          setProfile(record)
          setForm(getEditableValues(record))
        }
      } catch (loadError) {
        if (active) setError(loadError.message || 'Your profile could not be loaded.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadProfile()
    return () => { active = false }
  }, [currentUser.id, reload])

  function handleChange(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
    setError('')
    setSuccess('')
  }

  async function handlePhotoChange(event) {
    const input = event.currentTarget
    const file = input.files?.[0]
    input.value = ''
    if (!file) return

    setPhotoError('')
    setError('')
    setSuccess('')
    setProcessingPhoto(true)
    try {
      setPhotoPreview(await createProfilePhoto(file))
    } catch (photoProcessingError) {
      setPhotoError(photoProcessingError.message || 'The selected image could not be processed.')
    } finally {
      setProcessingPhoto(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (photoError) return
    if (processingPhoto) {
      setError('Wait for the selected image to finish processing.')
      return
    }
    if (!form.name.trim()) {
      setError('Enter your name.')
      return
    }

    setSaving(true)
    try {
      const updateData = {
        name: form.name,
        bio: form.bio,
        phone: form.phone,
      }
      if (photoPreview) updateData.avatarUrl = photoPreview
      const updated = await profilesService.update(currentUser.id, updateData, currentUser.id)
      const updatedProfile = {
        ...profile,
        ...getEditableValues(updated),
        avatarUrl: updated.avatarUrl || null,
        ...(profile.association
          ? { association: { ...profile.association, name: updated.name } }
          : {}),
      }
      setProfile(updatedProfile)
      setForm(getEditableValues(updatedProfile))
      setPhotoPreview(null)
      setPhotoError('')
      setCurrentUser(updated)
      setSuccess('Your profile has been updated.')
    } catch (saveError) {
      if (photoPreview) setPhotoPreview(null)
      setError(saveError.message || 'Your profile could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-600">Account</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">My Profile</h1>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Update the profile information shown to the campus community.
        </p>
      </header>

      {loading && <Card role="status" className="text-sm text-slate-500">Loading profile…</Card>}
      {!loading && error && !profile && (
        <Alert
          variant="danger"
          title="Profile unavailable"
          action={<Button size="sm" variant="outline" onClick={() => setReload((count) => count + 1)}>Try again</Button>}
        >
          {error}
        </Alert>
      )}
      {!loading && profile && (
        <>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success" onClose={() => setSuccess('')}>{success}</Alert>}
          <ProfileDetails
            profile={profile}
            avatarUrl={photoPreview || profile.avatarUrl}
            onChangePhoto={() => photoInputRef.current?.click()}
            photoInputRef={photoInputRef}
            onPhotoChange={handlePhotoChange}
            photoError={photoError}
            processingPhoto={processingPhoto}
          />

          <Card padding="lg">
            <h2 className="mb-5 text-lg font-bold text-slate-950">Edit profile</h2>
            <form noValidate onSubmit={handleSubmit} className="space-y-5">
              <FormField label="Name" id="profile-name" required>
                <Input
                  id="profile-name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  maxLength={120}
                  autoComplete="name"
                  required
                />
              </FormField>
              <FormField label="About" id="profile-bio">
                <Textarea
                  id="profile-bio"
                  name="bio"
                  value={form.bio}
                  onChange={handleChange}
                  rows={4}
                />
              </FormField>
              <FormField label="Phone number" id="profile-phone">
                <Input
                  id="profile-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={handleChange}
                />
              </FormField>
              <div className="flex justify-end border-t border-slate-100 pt-4">
                <Button type="submit" isLoading={saving} disabled={processingPhoto}>
                  Save profile
                </Button>
              </div>
            </form>
          </Card>
        </>
      )}
    </div>
  )
}

export default ProfilePage
