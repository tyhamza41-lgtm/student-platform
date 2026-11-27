import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Alert, Button, Card, EmptyState } from '../../../components/ui'
import { useAuth } from '../../../context/AuthContext'
import * as activityService from '../activity.service'

const KIND_LABELS = {
  post: 'Post',
  comment: 'Comment',
  reaction: 'Reaction',
  registration: 'Event registration',
  event: 'Event',
  issue: 'Class Issue',
}

function formatActivityDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function getRequestKey(user, reload) {
  return [
    user.id,
    user.role,
    user.classId || '',
    user.isRepresentative === true,
    user.representativeStatus || '',
    user.isActive !== false,
    reload,
  ].join(':')
}

function ActivityEntry({ activity }) {
  return (
    <li className="px-4 py-4 first:pt-0 last:pb-0 sm:px-5">
      <article className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-violet-700">
            {KIND_LABELS[activity.kind] || 'Activity'}
          </span>
          {activity.occurredAt ? (
            <time
              dateTime={activity.occurredAt}
              className="text-xs text-slate-500"
            >
              {formatActivityDate(activity.occurredAt)}
            </time>
          ) : (
            <span className="text-xs text-slate-400">Date and time not recorded</span>
          )}
        </div>
        <h2 className="text-sm font-semibold text-slate-900">{activity.title}</h2>
        {activity.relatedTitle && (
          <p className="line-clamp-2 break-words text-sm text-slate-700">
            {activity.relatedTitle}
          </p>
        )}
        {activity.summary && (
          <p className="line-clamp-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
            {activity.summary}
          </p>
        )}
        {activity.href && (
          <Link
            to={activity.href}
            className="inline-flex min-h-8 items-center rounded-md text-sm font-semibold text-violet-700 hover:text-violet-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            View related {activity.relatedType}
            <span aria-hidden="true" className="ml-1">→</span>
          </Link>
        )}
      </article>
    </li>
  )
}

function MyActivityPage() {
  const { currentUser } = useAuth()
  const [response, setResponse] = useState({ requestKey: null, data: null, error: '' })
  const [selectedFilter, setSelectedFilter] = useState({ requestKey: null, category: 'ALL' })
  const [reload, setReload] = useState(0)
  const requestKey = getRequestKey(currentUser, reload)
  const loadingForCurrentUser = response.requestKey !== requestKey
  const activityData = response.data || { activities: [], categories: [] }
  const error = loadingForCurrentUser ? '' : response.error
  const selectedCategory = selectedFilter.requestKey === requestKey
    ? selectedFilter.category
    : 'ALL'

  useEffect(() => {
    let active = true
    activityService.getMyActivity(currentUser.id)
      .then((result) => {
        if (!active) return
        setResponse({ requestKey, data: result, error: '' })
      })
      .catch((loadError) => {
        if (!active) return
        setResponse({
          requestKey,
          data: null,
          error: loadError.message || 'Your activity could not be loaded.',
        })
      })

    return () => { active = false }
  }, [
    currentUser.id,
    currentUser.role,
    currentUser.isActive,
    currentUser.isRepresentative,
    currentUser.representativeStatus,
    currentUser.classId,
    reload,
    requestKey,
  ])

  const filters = [
    { id: 'ALL', label: 'All Activity' },
    ...activityData.categories,
  ]
  const visibleActivities = selectedCategory === 'ALL'
    ? activityData.activities
    : activityData.activities.filter((item) => item.category === selectedCategory)

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-600">Account</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">My Activity</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
          Review your posts, comments, reactions, and other activity across the platform.
        </p>
        {!loadingForCurrentUser && !error && (
          <p className="mt-2 text-sm font-medium text-slate-600">
            {activityData.activities.length} {activityData.activities.length === 1 ? 'activity' : 'activities'} recorded
          </p>
        )}
      </header>

      {error && (
        <Alert
          variant="danger"
          title="Activity unavailable"
          action={(
            <Button size="sm" variant="outline" onClick={() => setReload((count) => count + 1)}>
              Try again
            </Button>
          )}
        >
          {error}
        </Alert>
      )}

      {loadingForCurrentUser ? (
        <Card role="status" className="text-sm text-slate-500">Loading your activity…</Card>
      ) : !error && (
        <>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter activity">
            {filters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                aria-pressed={selectedCategory === filter.id}
                onClick={() => setSelectedFilter({ requestKey, category: filter.id })}
                className={`min-h-9 rounded-full border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                  selectedCategory === filter.id
                    ? 'border-violet-600 bg-violet-600 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:bg-violet-50'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {visibleActivities.length === 0 ? (
            <Card>
              <EmptyState
                title={selectedCategory === 'ALL' ? 'No activity yet' : `No ${filters.find(({ id }) => id === selectedCategory)?.label.toLowerCase()} yet`}
                description={selectedCategory === 'ALL'
                  ? 'Your supported activity will appear here as you use the platform.'
                  : 'There are no activities in this category.'}
              />
            </Card>
          ) : (
            <Card padding="none" className="overflow-hidden">
              <ul aria-label="Your activity" className="divide-y divide-slate-100">
                {visibleActivities.map((activity) => (
                  <ActivityEntry key={activity.id} activity={activity} />
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

export default MyActivityPage
