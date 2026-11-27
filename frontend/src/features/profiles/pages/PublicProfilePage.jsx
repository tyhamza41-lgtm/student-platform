import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Alert, Button, Card } from '../../../components/ui'
import { ROUTES } from '../../../constants/routes'
import * as profilesService from '../profiles.service'
import ProfileDetails from './ProfileDetails'

function PublicProfilePage() {
  const { userId } = useParams()
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [loadedUserId, setLoadedUserId] = useState(null)
  const loading = loadedUserId !== userId

  useEffect(() => {
    let active = true

    async function loadProfile() {
      try {
        const user = await profilesService.getById(userId)
        if (!user) {
          if (active) {
            setProfile(null)
            setError('This profile could not be found.')
          }
          return
        }
        if (active) {
          setProfile(user)
          setError('')
        }
      } catch (loadError) {
        if (active) {
          setProfile(null)
          setError(loadError.message || 'This profile could not be loaded.')
        }
      } finally {
        if (active) setLoadedUserId(userId)
      }
    }
    loadProfile()
    return () => { active = false }
  }, [reload, userId])

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link to={ROUTES.FEED} className="inline-flex text-sm font-semibold text-violet-700 hover:text-violet-900">
        ← Back to feed
      </Link>
      {loading && <Card role="status" className="text-sm text-slate-500">Loading profile…</Card>}
      {!loading && error && (
        <Alert
          variant="danger"
          title="Profile unavailable"
          action={<Button size="sm" variant="outline" onClick={() => {
            setLoadedUserId(null)
            setReload((count) => count + 1)
          }}>Try again</Button>}
        >
          {error}
        </Alert>
      )}
      {!loading && profile && <ProfileDetails profile={profile} headingLevel={1} />}
    </div>
  )
}

export default PublicProfilePage
