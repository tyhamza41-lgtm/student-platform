import PostCard from '../../posts/components/PostCard'

function RecentPosts({ posts = [], onPostDeleted, onPostModerated }) {
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
            onDeleted={onPostDeleted}
            onModerated={onPostModerated}
          />
        ))}
      </div>
    </section>
  )
}

export default RecentPosts
