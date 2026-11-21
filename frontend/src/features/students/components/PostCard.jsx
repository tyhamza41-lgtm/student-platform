import { useState } from 'react'
import { Avatar, Badge } from '../../../components/ui'
import { formatDate } from '../../../utils/formatDate'
import { REACTION_TYPES } from '../../../mocks/data/reactions'

function ReactionIcon({ type }) {
  if (type === 'like') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="size-4">
        <path d="M7.5 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3.5m0 11V11l4.5-8a3 3 0 0 1 3 3v4h3.7a2 2 0 0 1 2 2.24l-1 7A2 2 0 0 1 17.7 21H7.5Z" />
      </svg>
    )
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="size-4">
      <path d="M7.5 2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3.5m0-11v11l4.5 8a3 3 0 0 0 3-3v-4h3.7a2 2 0 0 0 2-2.24l-1-7A2 2 0 0 0 17.7 3H7.5Z" />
    </svg>
  )
}

function PostCard({ post, comments, reaction, onReactionChange }) {
  const [commentsOpen, setCommentsOpen] = useState(false)

  const counts = {
    like: post.likeCount + (reaction === REACTION_TYPES.LIKE ? 1 : 0),
    dislike: post.dislikeCount + (reaction === REACTION_TYPES.DISLIKE ? 1 : 0),
  }

  return (
    <article className="min-w-0 rounded-2xl border border-slate-200/75 bg-white p-5 shadow-[0_6px_18px_rgba(15,23,42,0.025)] sm:p-6">
      <header className="flex items-start gap-3.5">
        <Avatar src={post.authorAvatar} name={post.authorName} alt={`${post.authorName} profile`} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="truncate text-[14px] font-bold text-slate-950">{post.authorName}</h3>
            <Badge variant="outline" size="xs" className="max-w-full truncate border-slate-200 text-slate-500">{post.authorRole}</Badge>
          </div>
          <time className="mt-0.5 block text-xs text-slate-500" dateTime={post.publishedAt}>
            {formatDate(post.publishedAt)}
          </time>
        </div>
      </header>

      <p className="mt-4 text-[15px] leading-7 text-slate-700">{post.content}</p>

      {post.imageUrl && (
        <img
          src={post.imageUrl}
          alt={`Campus announcement image shared by ${post.authorName}`}
          className="mt-4 aspect-[16/8] max-h-72 w-full rounded-xl object-cover"
        />
      )}

      <footer className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={() => onReactionChange(post.id, REACTION_TYPES.LIKE)}
          aria-pressed={reaction === REACTION_TYPES.LIKE}
          aria-label={`Like post by ${post.authorName}`}
          className={`inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${reaction === REACTION_TYPES.LIKE ? 'bg-violet-100 text-violet-700' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <ReactionIcon type="like" />
          <span>{counts.like}</span>
        </button>
        <button
          type="button"
          onClick={() => onReactionChange(post.id, REACTION_TYPES.DISLIKE)}
          aria-pressed={reaction === REACTION_TYPES.DISLIKE}
          aria-label={`Dislike post by ${post.authorName}`}
          className={`inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${reaction === REACTION_TYPES.DISLIKE ? 'bg-red-100 text-red-700' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <ReactionIcon type="dislike" />
          <span>{counts.dislike}</span>
        </button>
        <button
          type="button"
          onClick={() => setCommentsOpen((open) => !open)}
          aria-expanded={commentsOpen}
          aria-controls={`comments-${post.id}`}
          aria-label={`${commentsOpen ? 'Hide' : 'Show'} comments for post by ${post.authorName}`}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
            <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
          </svg>
          <span>{comments.length} comments</span>
        </button>
      </footer>

      {commentsOpen && (
        <div id={`comments-${post.id}`} className="mt-4 space-y-3 rounded-lg bg-slate-50 p-4" aria-label={`Comments on ${post.authorName}'s post`}>
          {comments.length ? comments.slice(0, 2).map((comment) => (
            <div key={comment.id} className="text-sm">
              <span className="font-semibold text-slate-800">{comment.authorName}</span>
              <span className="ml-2 text-slate-600">{comment.content}</span>
            </div>
          )) : (
            <p className="text-sm text-slate-500">No comments yet.</p>
          )}
        </div>
      )}
    </article>
  )
}

export default PostCard
