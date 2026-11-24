import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Alert, Button, Card, EmptyState } from '../../../components/ui'
import { ROUTES } from '../../../constants/routes'
import { useAuth } from '../../../context/AuthContext'
import * as postsService from '../posts.service'
import { canCreatePost } from '../postPermissions'
import PostCard from '../components/PostCard'

function MyPostsPage() {
  const { currentUser } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadCount, setReloadCount] = useState(0)

  useEffect(() => {
    let active = true
    postsService.getAll({ authorId: currentUser.id })
      .then((records) => {
        if (active) setPosts(records.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)))
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || 'Your posts could not be loaded.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [currentUser.id, reloadCount])

  function removePost(postId) {
    setPosts((current) => current.filter((post) => post.id !== postId))
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-600">Post management</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">My posts</h1>
          <p className="mt-1 text-sm text-slate-500">Manage announcements published from your account.</p>
        </div>
        {canCreatePost(currentUser) && (
          <Link to={currentUser.role === 'ASSOCIATION' ? ROUTES.ASSOCIATION.CREATE_POST : currentUser.role === 'DIRECTOR' ? ROUTES.DIRECTOR.CREATE_POST : ROUTES.REPRESENTATIVE.CREATE_POST}>
            <Button>Create post</Button>
          </Link>
        )}
      </header>

      {loading && <Card role="status" className="text-sm text-slate-500">Loading your posts…</Card>}
      {error && (
        <Alert variant="danger" title="Unable to load posts" action={
          <Button size="sm" variant="outline" onClick={() => {
            setLoading(true)
            setError('')
            setReloadCount((count) => count + 1)
          }}>Try again</Button>
        }>{error}</Alert>
      )}
      {!loading && !error && posts.length === 0 && (
        <EmptyState
          title="No posts yet"
          description="Posts you publish will appear here so you can edit or remove them."
          action={canCreatePost(currentUser) ? <Link to={currentUser.role === 'ASSOCIATION' ? ROUTES.ASSOCIATION.CREATE_POST : ROUTES.REPRESENTATIVE.CREATE_POST}><Button>Create your first post</Button></Link> : undefined}
        />
      )}
      {!loading && !error && posts.length > 0 && (
        <div className="space-y-5">
          {posts.map((post) => <PostCard key={post.id} post={post} onDeleted={removePost} />)}
        </div>
      )}
    </div>
  )
}

export default MyPostsPage
