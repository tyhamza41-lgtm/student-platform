import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Alert, Button, Card, StatCard } from '../../../components/ui'
import { ROUTES } from '../../../constants/routes'
import { useAuth } from '../../../context/AuthContext'
import * as directorService from '../director.service'
import DirectorPageHeader from '../components/DirectorPageHeader'

const MANAGEMENT_LINKS = [
  {
    label: 'User Deletion',
    description: 'Search student, representative, and association accounts and delete eligible users.',
    path: ROUTES.DIRECTOR.STUDENTS,
  },
  {
    label: 'Associations',
    description: 'Manage registered associations and their profiles.',
    path: ROUTES.DIRECTOR.ASSOCIATIONS,
  },
  {
    label: 'Representatives',
    description: 'Assign up to 3 active students per class and manage representatives.',
    path: ROUTES.DIRECTOR.REPRESENTATIVES,
  },
  {
    label: 'Class Issues Management',
    description: 'Review reports, update their status, or remove an issue.',
    path: ROUTES.DIRECTOR.ISSUES,
  },
  {
    label: 'Events',
    description: 'Browse campus events and remove events when needed.',
    path: ROUTES.EVENTS,
  },
]

function DirectorDashboard() {
  const { currentUser } = useAuth()
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let active = true
    async function loadOverview() {
      setLoading(true)
      setError('')
      try {
        const data = await directorService.getOverview(currentUser.id)
        if (active) setOverview(data)
      } catch (loadError) {
        if (active) setError(loadError.message || 'The platform overview could not be loaded.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadOverview()
    return () => { active = false }
  }, [currentUser.id, reload])

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <DirectorPageHeader
        title="Dashboard"
        description={`Welcome, ${currentUser.name}. Review platform activity and open a management area.`}
      />

      {error && (
        <Alert
          variant="danger"
          title="Dashboard unavailable"
          action={<Button size="sm" variant="outline" onClick={() => setReload((count) => count + 1)}>Try again</Button>}
        >
          {error}
        </Alert>
      )}

      {loading ? (
        <Card role="status" className="text-sm text-slate-500">Loading platform overview…</Card>
      ) : overview && (
        <section aria-label="Platform overview" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            title="Students"
            value={overview.studentCount}
            description="Registered student accounts"
          />
          <StatCard
            title="Associations"
            value={overview.associationCount}
            description="Registered associations"
          />
          <StatCard title="Posts" value={overview.postCount} description="Across the platform" />
          <StatCard title="Pending issues" value={overview.pendingIssueCount} description="Awaiting review" />
          <StatCard title="Events" value={overview.eventCount} description="Published and cancelled" />
        </section>
      )}

      <section aria-labelledby="management-heading" className="space-y-3">
        <div>
          <h2 id="management-heading" className="text-lg font-bold text-slate-900">Management areas</h2>
          <p className="mt-1 text-sm text-slate-500">Choose a workflow to review or manage platform records.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {MANAGEMENT_LINKS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <Card hover className="h-full">
                <h3 className="font-semibold text-slate-900">{item.label}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">{item.description}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

export default DirectorDashboard
