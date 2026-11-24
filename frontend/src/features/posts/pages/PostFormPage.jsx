import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Alert, Button, Card, FileUpload, FormField, Textarea } from '../../../components/ui'
import { ROUTES } from '../../../constants/routes'
import { USER_ROLES } from '../../../constants/roles'
import { useAuth } from '../../../context/AuthContext'
import { isRepresentative } from '../../../constants/navigation'
import * as postsService from '../posts.service'
import { canCreatePost, canManagePost } from '../postPermissions'

const MAX_IMAGE_SIZE = 2 * 1024 * 1024

function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('The selected image could not be read.'))
    reader.readAsDataURL(file)
  })
}

function PostFormPage() {
  const { postId } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const isEditing = Boolean(postId)
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isEditing) return undefined
    let active = true
    async function loadPost() {
      try {
        const post = await postsService.getById(postId)
        if (!active) return
        if (!post) {
          setError('This post could not be found.')
        } else if (!canManagePost(post, currentUser)) {
          setError('You do not have permission to edit this post.')
        } else {
          setContent(post.content)
          setImageUrl(post.imageUrl || null)
          setImagePreview(post.imageUrl || '')
        }
      } catch (loadError) {
        if (active) setError(loadError.message || 'This post could not be loaded.')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadPost()
    return () => { active = false }
  }, [currentUser, isEditing, postId])

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
      setImagePreview('')
      setError(readError.message)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    if (!content.trim()) {
      setError('Write something before publishing your post.')
      return
    }
    if (content.length > 5000) {
      setError('Post content must be 5,000 characters or fewer.')
      return
    }
    if (!currentUser || (isEditing ? !canManagePost({ authorId: currentUser.id }, currentUser) : !canCreatePost(currentUser))) {
      setError('You do not have permission to publish posts.')
      return
    }

    setSaving(true)
    try {
      const nextImageUrl = imageFile ? await readImage(imageFile) : imageUrl
      const data = { content: content.trim(), imageUrl: nextImageUrl || null }
      if (isEditing) {
        const updated = await postsService.update(postId, data, currentUser.id)
        navigate(ROUTES.POSTS.DETAIL(updated.id), {
          replace: true,
          state: { successMessage: 'Your post has been updated.' },
        })
        return
      }

      if (currentUser.role === USER_ROLES.STUDENT && isRepresentative(currentUser)) {
        data.classId = currentUser.classId
      }
      const created = await postsService.create(data, currentUser.id)
      navigate(ROUTES.POSTS.DETAIL(created.id), {
        replace: true,
        state: { successMessage: 'Your post has been published.' },
      })
    } catch (submitError) {
      setError(submitError.message || 'Your post could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  const canCreate = canCreatePost(currentUser)
  const canEdit = isEditing && !loading && !error
  const canSubmit = isEditing ? canEdit : canCreate

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-600">
          {isEditing ? 'Post management' : 'Campus community'}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
          {isEditing ? 'Edit Post' : 'Create Post'}
        </h1>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          {isEditing ? 'Update your announcement and attachment.' : 'Share an update with your campus community.'}
        </p>
      </header>

      {loading ? (
        <Card role="status" className="text-sm text-slate-500">Loading post…</Card>
      ) : error && isEditing && !canEdit ? (
        <Alert variant="danger" title="Post unavailable">{error}</Alert>
      ) : !isEditing && !canCreate ? (
        <Alert variant="danger" title="Post creation unavailable">
          Your account does not have permission to create posts.
        </Alert>
      ) : (
        <Card padding="lg">
          {error && <Alert variant="danger" className="mb-5">{error}</Alert>}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <FormField
              label="Post content"
              required
              helperText={`${content.length}/5000 characters`}
              id="post-content"
            >
              <Textarea
                id="post-content"
                name="content"
                rows={7}
                maxLength={5000}
                placeholder="What would you like to share?"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                aria-required="true"
              />
            </FormField>

            <FileUpload
              label="Image attachment (optional)"
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
                  alt="Preview of the post attachment"
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
                to={isEditing ? ROUTES.POSTS.DETAIL(postId) : ROUTES.FEED}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
              >
                Cancel
              </Link>
              <Button type="submit" isLoading={saving} disabled={!canSubmit}>
                {isEditing ? 'Save changes' : 'Publish post'}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  )
}

export default PostFormPage
