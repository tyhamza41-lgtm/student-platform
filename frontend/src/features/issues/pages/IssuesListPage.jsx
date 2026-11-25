import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { Alert, Avatar, Badge, Button, Card, EmptyState } from '../../../components/ui'
import { isRepresentative } from '../../../constants/navigation'
import { ROUTES } from '../../../constants/routes'
import { formatRelativeTime } from '../../../utils/formatRelativeTime'
import { useAuth } from '../../../context/AuthContext'
import * as directorService from '../../director/director.service'
import * as issuesService from '../issues.service'

const STATUS_LABELS = {
  PENDING: 'Pending',
  VIEWED: 'Viewed',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
}

const STATUS_VARIANTS = {
  PENDING: 'warning',
  VIEWED: 'info',
  IN_PROGRESS: 'primary',
  RESOLVED: 'success',
}

function getClassGroupLabel(issue) {
  const name = issue.className || issue.classId
  const identifier = issue.classId && issue.classId !== name ? ` (${issue.classId})` : ''
  return `Class/Group: ${name}${identifier}`
}

function IssuesListPage({ directorMode = false }) {
  const { currentUser } = useAuth()
  const location = useLocation()
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(location.state?.successMessage || '')
  const [reload, setReload] = useState(0)
  const canCreateIssue = !directorMode &&
    isRepresentative(currentUser) &&
    currentUser.isActive !== false

  useEffect(() => {
    let active = true

    async function loadIssues() {
      setLoading(true)
      setError('')
      try {
        const records = directorMode
          ? await directorService.getClassIssues(currentUser.id)
          : await issuesService.getAll()
        if (active) {
          setIssues(records.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)))
        }
      } catch (loadError) {
        if (active) {
          setIssues([])
          setError(loadError.message || 'Class issues could not be loaded.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadIssues()
    return () => { active = false }
  }, [currentUser?.id, directorMode, reload])

  function retryLoading() {
    setLoading(true)
    setError('')
    setReload((count) => count + 1)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-600">
            {directorMode ? 'Platform management' : 'Campus reports'}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
            {directorMode ? 'Class Issues Management' : 'Class Issues'}
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            {directorMode
              ? 'Review reports from every class and keep students informed.'
              : 'Browse reports from every class and group and follow their progress.'}
          </p>
        </div>
        {canCreateIssue && (
          <Link
            to={ROUTES.REPRESENTATIVE.CREATE_ISSUE}
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
          >
            Create class issue
          </Link>
        )}
      </header>

      {success && <Alert variant="success" onClose={() => setSuccess('')}>{success}</Alert>}
      {error && (
        <Alert
          variant="danger"
          title="Class issues unavailable"
          action={<Button size="sm" variant="outline" onClick={retryLoading}>Try again</Button>}
        >
          {error}
        </Alert>
      )}

      {loading ? (
        <Card role="status" className="text-sm text-slate-500">Loading class issues…</Card>
      ) : !error && issues.length === 0 ? (
        <Card>
          <EmptyState
            title="No class issues yet"
            description={directorMode
              ? 'New reports from students will appear here.'
              : 'Reports submitted across classes and groups will appear here.'}
          />
        </Card>
      ) : !error && (
        <ul className="grid gap-4 md:grid-cols-2" aria-label="Class issues">
          {issues.map((issue) => (
            <li key={issue.id} className="min-w-0">
              <article>
                <Card hover className="h-full">
                  <div className="flex h-full flex-col gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <Badge variant={STATUS_VARIANTS[issue.status] || 'default'} dot>
                        {STATUS_LABELS[issue.status] || issue.status}
                      </Badge>
                      <time
                        dateTime={issue.submittedAt}
                        className="shrink-0 text-xs text-slate-400"
                      >
                        {formatRelativeTime(issue.submittedAt)}
                      </time>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-bold leading-snug text-slate-950">
                        <Link
                          to={directorMode
                            ? ROUTES.DIRECTOR.ISSUE_DETAILS(issue.id)
                            : ROUTES.ISSUE_DETAILS(issue.id)}
                          className="rounded-sm hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                        >
                          {issue.title}
                        </Link>
                      </h2>
                      <p className="mt-2 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                        {issue.description}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <Link
                          to={ROUTES.USER_PROFILE(issue.submittedById)}
                          aria-label={`View ${issue.submittedByName}'s profile`}
                        >
                          <Avatar
                            src={issue.submittedByAvatar}
                            name={issue.submittedByName}
                            alt={`${issue.submittedByName} profile`}
                            size="sm"
                          />
                        </Link>
                        <div className="min-w-0">
                          <Link
                            to={ROUTES.USER_PROFILE(issue.submittedById)}
                            className="block truncate text-xs font-semibold text-slate-700 hover:text-violet-700"
                          >
                            {issue.submittedByName}
                          </Link>
                          <span className="text-xs font-medium text-slate-500">
                            {getClassGroupLabel(issue)}
                          </span>
                        </div>
                      </div>
                      <Link
                        to={directorMode
                          ? ROUTES.DIRECTOR.ISSUE_DETAILS(issue.id)
                          : ROUTES.ISSUE_DETAILS(issue.id)}
                        aria-label={`View issue: ${issue.title}`}
                        className="ml-auto inline-flex min-h-9 items-center rounded-lg px-3 text-sm font-semibold text-violet-700 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                      >
                        View details
                      </Link>
                    </div>
                  </div>
                </Card>
              </article>
            </li>
          ))}
        </ul>
      )}

      {!loading && !error && issues.length > 0 && (
        <p className="text-right text-sm text-slate-500">
          {issues.length} {issues.length === 1 ? 'issue' : 'issues'}
        </p>
      )}

    </div>
  )
}

export default IssuesListPage
