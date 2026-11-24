import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Alert, Avatar, Badge, Card } from '../../../components/ui'
import { ROUTES } from '../../../constants/routes'
import { getUserRoleLabel } from '../../../constants/navigation'
import * as associationsService from '../../associations/associations.service'
import * as profilesService from '../profiles.service'

function PublicProfilePage() {
  const { userId } = useParams()
  const [profile, setProfile] = useState(null)
  const [association, setAssociation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function loadProfile() {
      try {
        const user = await profilesService.getById(userId)
        if (!user) {
          if (active) setError('This profile could not be found.')
          return
        }
        const associationRecord = user.associationId
          ? await associationsService.getById(user.associationId)
          : null
        if (active) {
          setProfile(user)
          setAssociation(associationRecord)
        }
      } catch (loadError) {
        if (active) setError(loadError.message || 'This profile could not be loaded.')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadProfile()
    return () => { active = false }
  }, [userId])

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link to={ROUTES.FEED} className="inline-flex text-sm font-semibold text-violet-700 hover:text-violet-900">
        ← Back to feed
      </Link>
      {loading && <Card role="status" className="text-sm text-slate-500">Loading profile…</Card>}
      {!loading && error && <Alert variant="danger" title="Profile unavailable">{error}</Alert>}
      {!loading && profile && (
        <Card padding="lg" className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left">
          <Avatar src={profile.avatarUrl} name={profile.name} alt={`${profile.name} profile`} size="xl" />
          <div className="mt-4 min-w-0 sm:ml-5 sm:mt-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">{profile.name}</h1>
            <Badge variant="outline" className="mt-2">{getUserRoleLabel(profile)}</Badge>
            {(association?.description || profile.bio) && (
              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {association?.description || profile.bio}
              </p>
            )}
            {association?.institution && (
              <p className="mt-3 text-xs font-medium text-slate-500">{association.institution}</p>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}

export default PublicProfilePage
