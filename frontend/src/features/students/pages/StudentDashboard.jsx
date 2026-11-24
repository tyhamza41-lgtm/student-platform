import { useMemo, useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import NavigationIcon from '../../../components/navigation/NavigationIcon'
import { Card } from '../../../components/ui'
import { users } from '../../../mocks/data/users'
import { posts as mockPosts } from '../../../mocks/data/posts'
import { events as mockEvents } from '../../../mocks/data/events'
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

function StudentDashboard({ postsData = mockPosts, eventsData = mockEvents }) {
  const { currentUser } = useAuth()
  const [registrationRecords, setRegistrationRecords] = useState({})
  const registeredEventIds = useMemo(() => {
    const availableEventIds = new Set(eventsData.map((event) => event.id))
    const registeredIds = new Set(
      eventsData
        .filter((event) => event.initiallyParticipating)
        .map((event) => event.id),
    )

    Object.keys(registrationRecords).forEach((eventId) => {
      if (availableEventIds.has(eventId)) registeredIds.add(eventId)
    })

    return registeredIds
  }, [eventsData, registrationRecords])

  const student = {
    ...developmentStudent,
    ...currentUser,
    name: currentUser?.name || developmentStudent?.name || 'Student',
    avatarUrl: currentUser?.avatarUrl || developmentStudent?.avatarUrl,
  }
  const hasPosts = postsData.length > 0
  const hasEvents = eventsData.length > 0

  function registerForEvent(eventId, registration) {
    if (registeredEventIds.has(eventId)) return

    setRegistrationRecords((current) => (
      current[eventId]
        ? current
        : { ...current, [eventId]: { ...registration, userId: currentUser?.id } }
    ))
  }

  return (
    <div className="-mt-4 min-w-0 space-y-6 sm:-mt-5">
      <div className="space-y-4 sm:space-y-5">
        <WelcomeSection student={student} />
        <StudentStats
          events={eventsData}
          registeredEventIds={registeredEventIds}
        />
      </div>

      {hasPosts && hasEvents ? (
        <div
          data-dashboard-layout="feed-and-events"
          className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(292px,1fr)]"
        >
          <RecentPosts posts={postsData} />
          <aside className="min-w-0 space-y-5" aria-label="Student dashboard information">
            <UpcomingEvents
              events={eventsData}
              registeredEventIds={registeredEventIds}
              onRegister={registerForEvent}
            />
            <ClassInformation student={student} stacked />
          </aside>
        </div>
      ) : (
        <div
          data-dashboard-layout={hasPosts ? 'posts-only' : hasEvents ? 'events-only' : 'empty'}
          className="min-w-0 space-y-6"
        >
          {hasPosts && <RecentPosts posts={postsData} />}
          {hasEvents && (
            <UpcomingEvents
              events={eventsData}
              registeredEventIds={registeredEventIds}
              onRegister={registerForEvent}
              layout="wide"
            />
          )}
          {!hasPosts && !hasEvents && (
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
