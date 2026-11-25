import { useEffect, useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import NavigationIcon from '../../../components/navigation/NavigationIcon'
import { Button, Card } from '../../../components/ui'
import { users } from '../../../mocks/data/users'
import * as postsService from '../../posts/posts.service'
import * as eventsService from '../../events/events.service'
import WelcomeSection from '../components/WelcomeSection'
import StudentStats from '../components/StudentStats'
import RecentPosts from '../components/RecentPosts'
import UpcomingEvents from '../components/UpcomingEvents'
import ClassOverview from '../components/ClassOverview'
import RecentClassIssues from '../components/RecentClassIssues'

const developmentStudent = users.find((user) => user.id === 'student-1')

function DashboardEmptyState({ title, description, icon }) {
  return (
    <Card
      padding="none"
      className="flex min-h-44 flex-col items-start justify-center rounded-2xl border-dashed border-slate-300 bg-white p-6"
      role="status"
    >
      <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
        <NavigationIcon name={icon} className="size-5" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">{description}</p>
    </Card>
  )
}

function ClassInformation({ student, stacked = false }) {
  return (
    <div className={`grid min-w-0 gap-5 ${stacked ? '' : 'md:grid-cols-2'}`}>
      <ClassOverview student={student} />
      <RecentClassIssues />
    </div>
  )
}

function StudentDashboard({ postsData }) {
  const { currentUser } = useAuth()
  const [loadedPosts, setLoadedPosts] = useState(postsData ?? [])
  const [postsLoading, setPostsLoading] = useState(postsData === undefined)
  const [postsError, setPostsError] = useState('')
  const [postsReload, setPostsReload] = useState(0)
  const [loadedEvents, setLoadedEvents] = useState([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [eventsError, setEventsError] = useState('')
  const [eventsReload, setEventsReload] = useState(0)
  const [registeredEventIds, setRegisteredEventIds] = useState(new Set())

  useEffect(() => {
    if (postsData !== undefined) return undefined

    let active = true
    const filters = currentUser?.role === 'DIRECTOR' ? {} : { status: 'PUBLISHED' }
    postsService.getAll(filters)
      .then((records) => {
        if (active) {
          setLoadedPosts(records.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)))
        }
      })
      .catch((error) => {
        if (active) setPostsError(error.message || 'Posts could not be loaded.')
      })
      .finally(() => {
        if (active) setPostsLoading(false)
      })
    return () => { active = false }
  }, [postsData, currentUser?.role, postsReload])

  useEffect(() => {
    let active = true
    async function loadEvents() {
      try {
        const canParticipate = currentUser?.role === 'STUDENT' && currentUser.isActive !== false
        const [records, registrations] = await Promise.all([
          eventsService.getAll({ status: 'PUBLISHED' }),
          canParticipate ? eventsService.getMyRegistrations(currentUser.id) : Promise.resolve([]),
        ])
        if (active) {
          setLoadedEvents(records)
          setRegisteredEventIds(new Set(registrations.map((registration) => registration.eventId)))
          setEventsError('')
        }
      } catch (error) {
        if (active) setEventsError(error.message || 'Events could not be loaded.')
      } finally {
        if (active) setEventsLoading(false)
      }
    }
    loadEvents()
    return () => { active = false }
  }, [currentUser?.id, currentUser?.isActive, currentUser?.role, eventsReload])

  const student = {
    ...developmentStudent,
    ...currentUser,
    name: currentUser?.name || developmentStudent?.name || 'Student',
    avatarUrl: currentUser?.avatarUrl || developmentStudent?.avatarUrl,
  }

  const hasPosts = loadedPosts.length > 0
  const hasEvents = loadedEvents.length > 0
  const showEventsPanel = hasEvents || eventsLoading || Boolean(eventsError)

  function removePost(postId) {
    setLoadedPosts((current) => current.filter((post) => post.id !== postId))
  }

  function updatePost(updatedPost) {
    setLoadedPosts((current) => current.map((post) => (
      post.id === updatedPost.id ? updatedPost : post
    )))
  }

  function renderPosts() {
    if (postsLoading) {
      return <p role="status" className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading campus posts…</p>
    }
    if (postsError) {
      return (
        <Card className="space-y-3">
          <p role="alert" className="text-sm text-red-700">{postsError}</p>
          <Button size="sm" variant="outline" onClick={() => {
            setPostsLoading(true)
            setPostsError('')
            setPostsReload((count) => count + 1)
          }}>Try again</Button>
        </Card>
      )
    }
    if (hasPosts) {
      return <RecentPosts posts={loadedPosts} onPostDeleted={removePost} onPostModerated={updatePost} />
    }
    return null
  }

  function updateRegisteredEvent(updatedEvent) {
    setLoadedEvents((current) => current.map((event) => (
      event.id === updatedEvent.id ? updatedEvent : event
    )))
    setRegisteredEventIds((current) => new Set(current).add(updatedEvent.id))
  }

  function renderEventsPanel(layout = 'stacked') {
    if (eventsLoading) {
      return <Card role="status" className="text-sm text-slate-500">Loading upcoming events…</Card>
    }
    if (eventsError) {
      return (
        <Card className="space-y-3">
          <p role="alert" className="text-sm text-red-700">{eventsError}</p>
          <Button size="sm" variant="outline" onClick={() => {
            setEventsLoading(true)
            setEventsError('')
            setEventsReload((count) => count + 1)
          }}>Try again</Button>
        </Card>
      )
    }
    if (hasEvents) {
      return (
        <UpcomingEvents
          events={loadedEvents}
          registeredEventIds={registeredEventIds}
          onEventRegistered={updateRegisteredEvent}
          layout={layout}
        />
      )
    }
    return null
  }

  return (
    <div className="-mt-4 min-w-0 space-y-6 sm:-mt-5">
      <div className="space-y-4 sm:space-y-5">
        <WelcomeSection student={student} />
        <StudentStats
          events={loadedEvents}
          registeredEventIds={registeredEventIds}
        />
      </div>

      {hasPosts && showEventsPanel ? (
        <div
          data-dashboard-layout="feed-and-events"
          className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(292px,1fr)]"
        >
          {renderPosts()}
          <aside className="min-w-0 space-y-5" aria-label="Student dashboard information">
            {renderEventsPanel()}
            <ClassInformation student={student} stacked />
          </aside>
        </div>
      ) : (
        <div
          data-dashboard-layout={hasPosts ? 'posts-only' : showEventsPanel ? 'events-only' : 'empty'}
          className="min-w-0 space-y-6"
        >
          {(hasPosts || postsLoading || postsError) && renderPosts()}
          {!hasPosts && showEventsPanel && !postsLoading && !postsError && (
            <DashboardEmptyState
              title="No campus posts yet"
              description="Class announcements and campus updates will appear here when they are shared."
              icon="file-text"
            />
          )}
          {showEventsPanel && renderEventsPanel('wide')}
          {!hasPosts && !hasEvents && !postsLoading && !postsError && !eventsLoading && !eventsError && (
            <div className="grid min-w-0 gap-5 md:grid-cols-2">
              <DashboardEmptyState
                title="No campus posts yet"
                description="Class announcements and campus updates will appear here when they are shared."
                icon="file-text"
              />
              <DashboardEmptyState
                title="No upcoming events"
                description="There are no events scheduled right now. Check back soon for activities on campus."
                icon="calendar-days"
              />
            </div>
          )}
          <ClassInformation student={student} />
        </div>
      )}
    </div>
  )
}

export default StudentDashboard
