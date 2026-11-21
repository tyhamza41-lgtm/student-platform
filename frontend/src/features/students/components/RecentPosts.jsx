import { useState } from 'react'
import { posts as mockPosts } from '../../../mocks/data/posts'
import { comments } from '../../../mocks/data/comments'
import PostCard from './PostCard'

function RecentPosts({ posts = mockPosts }) {
  const [reactionsByPost, setReactionsByPost] = useState({})

  function updateReaction(postId, requestedReaction) {
    setReactionsByPost((current) => {
      const currentReaction = current[postId] ?? null
      const nextReaction = currentReaction === requestedReaction ? null : requestedReaction

      if (nextReaction === null) {
        const { [postId]: removed, ...remaining } = current
        void removed
        return remaining
      }

      return { ...current, [postId]: nextReaction }
    })
  }

  if (posts.length === 0) return null

  return (
    <section aria-labelledby="recent-posts-heading" className="min-w-0">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Campus feed</p>
          <h2 id="recent-posts-heading" className="mt-1 text-[19px] font-bold tracking-tight text-slate-950 sm:text-[21px]">Latest announcements</h2>
        </div>
      </div>

      <div className="space-y-5">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            comments={comments.filter((comment) => comment.postId === post.id)}
            reaction={reactionsByPost[post.id] ?? null}
            onReactionChange={updateReaction}
          />
        ))}
      </div>
    </section>
  )
}

export default RecentPosts
