import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ThumbsDown, ThumbsUp } from 'lucide-react'
import { Avatar, Badge, Button, ConfirmDialog, Modal } from '../../../components/ui'
import { useAuth } from '../../../context/AuthContext'
import { ROUTES } from '../../../constants/routes'
import { formatRelativeTime } from '../../../utils/formatRelativeTime'
import * as commentsService from '../../comments/comments.service'
import * as postsService from '../posts.service'
import { canDeletePost, canEditPost } from '../postPermissions'
import * as reactionsService from '../../reactions/reactions.service'
import * as usersService from '../../users/users.service'

function ReactionIcon({ type }) {
  const isLike = type === reactionsService.REACTION_TYPES.LIKE
  const Icon = isLike ? ThumbsUp : ThumbsDown
  return <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={2} />
}

function getClassGroupLabel(post) {
  const name = post.className || post.classId
  const identifier = post.classId && post.classId !== name ? ` (${post.classId})` : ''
  return `Class/Group: ${name}${identifier}`
}

function PostCard({ post, onDeleted, showCommentsPreview = true }) {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [currentPost, setCurrentPost] = useState(post)
  const [reaction, setReaction] = useState(null)
  const [postComments, setPostComments] = useState([])
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [peopleType, setPeopleType] = useState(null)
  const [reactionUsers, setReactionUsers] = useState([])
  const [peopleLoading, setPeopleLoading] = useState(false)
  const [peopleError, setPeopleError] = useState('')

  useEffect(() => {
    let active = true
    async function loadPostEngagement() {
      try {
        const [freshPost, postReactions, postCommentsResult] = await Promise.all([
          postsService.getById(post.id),
          reactionsService.getAll({ postId: post.id }),
          commentsService.getAll({ postId: post.id }),
        ])
        if (!active) return
        if (freshPost) setCurrentPost(freshPost)
        setReaction(postReactions.find((item) => item.userId === currentUser?.id)?.type ?? null)
        setPostComments(postCommentsResult)
      } catch (loadError) {
        if (active) setError(loadError.message || 'Could not load post engagement.')
      } finally {
        if (active) setIsLoading(false)
      }
    }

    loadPostEngagement()
    return () => { active = false }
  }, [post.id, currentUser?.id])

  useEffect(() => {
    let active = true
    async function loadReactionUsers() {
      if (!peopleType) return
      setPeopleLoading(true)
      setPeopleError('')
      try {
        const matching = await reactionsService.getAll({ postId: post.id })
        const users = await Promise.all(
          matching
            .filter((item) => item.type === peopleType)
            .map((item) => usersService.getById(item.userId)),
        )
        if (active) setReactionUsers(users.filter(Boolean))
      } catch (loadError) {
        if (active) setPeopleError(loadError.message || 'Could not load reaction details.')
      } finally {
        if (active) setPeopleLoading(false)
      }
    }
    loadReactionUsers()
    return () => { active = false }
  }, [peopleType, post.id])

  const canEdit = canEditPost(currentPost, currentUser)
  const canDelete = canDeletePost(currentPost, currentUser)

  async function refreshPost() {
    const [freshPost, postReactions, freshComments] = await Promise.all([
      postsService.getById(post.id),
      reactionsService.getAll({ postId: post.id }),
      commentsService.getAll({ postId: post.id }),
    ])
    if (freshPost) setCurrentPost(freshPost)
    setReaction(postReactions.find((item) => item.userId === currentUser?.id)?.type ?? null)
    setPostComments(freshComments)
  }

  async function handleReaction(type) {
    setIsBusy(true)
    setError('')
    try {
      await reactionsService.togglePostReaction(post.id, currentUser.id, type)
      await refreshPost()
    } catch (actionError) {
      setError(actionError.message || 'Could not update your reaction.')
    } finally {
      setIsBusy(false)
    }
  }

  async function handleDelete() {
    setIsBusy(true)
    setError('')
    try {
      await postsService.deletePost(post.id, currentUser.id)
      setConfirmDelete(false)
      if (onDeleted) onDeleted(post.id)
      else navigate(ROUTES.FEED, { replace: true })
    } catch (actionError) {
      setError(actionError.message || 'Could not delete this post.')
    } finally {
      setIsBusy(false)
    }
  }

  const likes = currentPost.likeCount || 0
  const dislikes = currentPost.dislikeCount || 0

  return (
    <article className="min-w-0 rounded-2xl border border-slate-200/75 bg-white p-5 shadow-[0_6px_18px_rgba(15,23,42,0.025)] sm:p-6">
      <header className="flex items-start gap-3.5">
        <Link to={ROUTES.USER_PROFILE(currentPost.authorId)} aria-label={`View ${currentPost.authorName}'s profile`}>
          <Avatar src={currentPost.authorAvatar} name={currentPost.authorName} alt={`${currentPost.authorName} profile`} size="md" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <Link to={ROUTES.USER_PROFILE(currentPost.authorId)} className="truncate text-[14px] font-bold text-slate-950 hover:text-violet-700">
              {currentPost.authorName}
            </Link>
            <Badge variant="outline" size="xs" className="max-w-full truncate border-slate-200 text-slate-500">{currentPost.authorRole}</Badge>
            {currentPost.status !== 'PUBLISHED' && (
              <Badge variant="warning" size="xs">{currentPost.status}</Badge>
            )}
          </div>
          <time className="mt-0.5 block text-xs text-slate-500" dateTime={currentPost.publishedAt}>
            {formatRelativeTime(currentPost.publishedAt)}
          </time>
          {currentPost.authorRole === 'Class Representative' && currentPost.classId && (
            <p className="mt-1 text-xs font-medium text-slate-500">
              {getClassGroupLabel(currentPost)}
            </p>
          )}
        </div>
        {(canEdit || canDelete) && (
          <div className="flex shrink-0 items-center gap-1">
            {canEdit && (
              <Link
                to={ROUTES.POSTS.EDIT(currentPost.id)}
                className="rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
              >
                Edit
              </Link>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="rounded-lg px-2.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </header>

      <p className="mt-4 whitespace-pre-wrap break-words text-[15px] leading-7 text-slate-700">{currentPost.content}</p>

      {currentPost.imageUrl && (
        <img
          src={currentPost.imageUrl}
          alt={`Image shared by ${currentPost.authorName}`}
          className="mt-4 max-h-[34rem] w-full rounded-xl object-cover"
        />
      )}

      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <footer className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleReaction(reactionsService.REACTION_TYPES.LIKE)}
            disabled={isBusy || isLoading || !currentUser}
            aria-pressed={reaction === reactionsService.REACTION_TYPES.LIKE}
            aria-label={`Like post by ${currentPost.authorName}`}
            className={`inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 ${reaction === reactionsService.REACTION_TYPES.LIKE ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <ReactionIcon type={reactionsService.REACTION_TYPES.LIKE} />
            <span>Like</span>
          </button>
          <button
            type="button"
            onClick={() => setPeopleType(reactionsService.REACTION_TYPES.LIKE)}
            aria-label={`View users who liked this post (${likes})`}
            className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg px-2 text-sm font-semibold text-slate-600 transition-colors duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            {likes}
          </button>
        </div>
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleReaction(reactionsService.REACTION_TYPES.DISLIKE)}
            disabled={isBusy || isLoading || !currentUser}
            aria-pressed={reaction === reactionsService.REACTION_TYPES.DISLIKE}
            aria-label={`Dislike post by ${currentPost.authorName}`}
            className={`inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50 ${reaction === reactionsService.REACTION_TYPES.DISLIKE ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <ReactionIcon type={reactionsService.REACTION_TYPES.DISLIKE} />
            <span>Dislike</span>
          </button>
          <button
            type="button"
            onClick={() => setPeopleType(reactionsService.REACTION_TYPES.DISLIKE)}
            aria-label={`View users who disliked this post (${dislikes})`}
            className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg px-2 text-sm font-semibold text-slate-600 transition-colors duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            {dislikes}
          </button>
        </div>
        {showCommentsPreview && (
          <button
            type="button"
            onClick={() => setCommentsOpen((open) => !open)}
            aria-expanded={commentsOpen}
            aria-controls={`comments-${currentPost.id}`}
            aria-label={`${commentsOpen ? 'Hide' : 'Show'} comments for post by ${currentPost.authorName}`}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
              <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
            </svg>
            <span>{postComments.length} comments</span>
          </button>
        )}
        <Link
          to={ROUTES.POSTS.DETAIL(currentPost.id)}
          className="ml-auto inline-flex h-10 items-center rounded-lg px-3 text-sm font-semibold text-violet-700 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          View post
        </Link>
      </footer>

      {commentsOpen && showCommentsPreview && (
        <div id={`comments-${currentPost.id}`} className="mt-4 space-y-3 rounded-lg bg-slate-50 p-4" aria-label={`Comments on ${currentPost.authorName}'s post`}>
          {postComments.length ? postComments.slice(0, 2).map((comment) => (
            <div key={comment.id} className="flex items-start gap-2.5 text-sm">
              <Link
                to={ROUTES.USER_PROFILE(comment.authorId)}
                aria-label={`View ${comment.authorName}'s profile`}
              >
                <Avatar src={comment.authorAvatar} name={comment.authorName} alt={`${comment.authorName} profile`} size="xs" />
              </Link>
              <p className="min-w-0">
                <Link to={ROUTES.USER_PROFILE(comment.authorId)} className="font-semibold text-slate-800 hover:text-violet-700">{comment.authorName}</Link>
                <span className="ml-2 text-slate-600">{comment.content}</span>
              </p>
            </div>
          )) : (
            <p className="text-sm text-slate-500">No comments yet.</p>
          )}
        </div>
      )}

      {isLoading && <span className="sr-only" role="status">Loading post activity</span>}

      <ConfirmDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete this post?"
        message="This will also permanently remove its comments and reactions."
        confirmText="Delete post"
        isLoading={isBusy}
      />

      <Modal
        isOpen={Boolean(peopleType)}
        onClose={() => setPeopleType(null)}
        title={peopleType === reactionsService.REACTION_TYPES.LIKE ? 'People who liked this post' : 'People who disliked this post'}
        size="sm"
      >
        {peopleError ? (
          <p role="alert" className="text-sm text-red-700">{peopleError}</p>
        ) : peopleLoading ? (
          <p role="status" className="text-sm text-slate-500">Loading people…</p>
        ) : reactionUsers.length ? (
          <ul className="space-y-2">
            {reactionUsers.map((user) => (
              <li key={user.id}>
                <Link
                  to={ROUTES.USER_PROFILE(user.id)}
                  onClick={() => setPeopleType(null)}
                  className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                >
                  <Avatar src={user.avatarUrl} name={user.name} alt={`${user.name} profile`} size="sm" />
                  <span className="text-sm font-semibold text-slate-800">{user.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No one has reacted this way yet.</p>
        )}
        <Button variant="outline" className="mt-5 w-full" onClick={() => setPeopleType(null)}>Close</Button>
      </Modal>
    </article>
  )
}

export default PostCard
