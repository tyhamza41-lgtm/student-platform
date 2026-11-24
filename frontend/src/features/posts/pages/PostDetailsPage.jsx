import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { Alert, Avatar, Button, Card, ConfirmDialog, EmptyState, FormField, Textarea } from '../../../components/ui'
import { ROUTES } from '../../../constants/routes'
import { USER_ROLES } from '../../../constants/roles'
import { useAuth } from '../../../context/AuthContext'
import { formatRelativeTime } from '../../../utils/formatRelativeTime'
import * as commentsService from '../../comments/comments.service'
import PostCard from '../components/PostCard'
import * as postsService from '../posts.service'

function PostDetailsPage() {
  const { postId } = useParams()
  const { currentUser } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [post, setPost] = useState(null)
  const [comments, setComments] = useState([])
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [commentToDelete, setCommentToDelete] = useState(null)
  const [success, setSuccess] = useState(location.state?.successMessage || '')

  useEffect(() => {
    let active = true
    Promise.all([
      postsService.getById(postId),
      commentsService.getAll({ postId }),
    ])
      .then(([record, commentRecords]) => {
        if (!active) return
        if (!record || (record.status !== 'PUBLISHED' && currentUser.role !== USER_ROLES.DIRECTOR)) {
          setPost(null)
          setError('This post is unavailable.')
        } else {
          setPost(record)
          setComments(commentRecords.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)))
        }
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || 'Post details could not be loaded.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [currentUser.role, postId])

  async function handleCommentSubmit(event) {
    event.preventDefault()
    setError('')
    if (!content.trim()) {
      setError('Write a comment before submitting.')
      return
    }
    setSubmitting(true)
    try {
      const created = await commentsService.add({ postId, content: content.trim() }, currentUser.id)
      setComments((current) => [...current, created])
      setContent('')
      setSuccess('Your comment has been added.')
    } catch (submitError) {
      setError(submitError.message || 'Your comment could not be added.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteComment() {
    if (!commentToDelete) return
    try {
      await commentsService.deleteComment(commentToDelete.id, currentUser.id)
      setComments((current) => current.filter((comment) => comment.id !== commentToDelete.id))
      setCommentToDelete(null)
    } catch (deleteError) {
      setError(deleteError.message || 'The comment could not be deleted.')
      setCommentToDelete(null)
    }
  }

  function handlePostDeleted() {
    navigate(ROUTES.FEED, { replace: true })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link to={ROUTES.FEED} className="text-sm font-semibold text-violet-700 hover:text-violet-900">← Back to feed</Link>
      </div>
      {loading && <Card role="status" className="text-sm text-slate-500">Loading post…</Card>}
      {!loading && error && !post && <Alert variant="danger" title="Post unavailable">{error}</Alert>}
      {!loading && post && (
        <>
          {success && <Alert variant="success" onClose={() => setSuccess('')}>{success}</Alert>}
          {error && <Alert variant="danger">{error}</Alert>}
          <PostCard post={post} onDeleted={handlePostDeleted} showCommentsPreview={false} />

          <Card padding="lg" className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Comments <span className="text-slate-400">({comments.length})</span></h2>
              <p className="mt-1 text-sm text-slate-500">Join the conversation on this post.</p>
            </div>
            {comments.length === 0 ? (
              <EmptyState title="No comments yet" description="Be the first to share a thoughtful response." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {comments.map((comment) => (
                  <li key={comment.id} className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
                    <Link to={ROUTES.USER_PROFILE(comment.authorId)} aria-label={`View ${comment.authorName}'s profile`}>
                      <Avatar src={comment.authorAvatar} name={comment.authorName} alt={`${comment.authorName} profile`} size="sm" />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <Link to={ROUTES.USER_PROFILE(comment.authorId)} className="text-sm font-semibold text-slate-900 hover:text-violet-700">
                          {comment.authorName}
                        </Link>
                        <time dateTime={comment.createdAt} className="text-xs text-slate-400">{formatRelativeTime(comment.createdAt)}</time>
                        {(comment.authorId === currentUser.id || currentUser.role === USER_ROLES.DIRECTOR) && (
                          <button
                            type="button"
                            onClick={() => setCommentToDelete(comment)}
                            className="ml-auto rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{comment.content}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <form onSubmit={handleCommentSubmit} className="space-y-3 border-t border-slate-100 pt-5">
              <FormField label="Add a comment" id="comment-content" required>
                <Textarea
                  id="comment-content"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="Share your thoughts…"
                  aria-required="true"
                />
              </FormField>
              <div className="flex justify-end">
                <Button type="submit" isLoading={submitting}>Post comment</Button>
              </div>
            </form>
          </Card>
        </>
      )}

      <ConfirmDialog
        isOpen={Boolean(commentToDelete)}
        onClose={() => setCommentToDelete(null)}
        onConfirm={handleDeleteComment}
        title="Delete this comment?"
        message="This comment will be permanently removed."
        confirmText="Delete comment"
      />
    </div>
  )
}

export default PostDetailsPage
