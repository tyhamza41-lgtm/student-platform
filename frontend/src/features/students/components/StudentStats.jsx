import NavigationIcon from '../../../components/navigation/NavigationIcon'
import { isRepresentative } from '../../../constants/navigation'
import { users as mockUsers } from '../../../mocks/data/users'
import { issues as mockIssues } from '../../../mocks/data/issues'

const dashboardOpenedAt = Date.now()

function StudentStats({
  events = [],
  users = mockUsers,
  issues = mockIssues,
  registeredEventIds = new Set(),
}) {
  const activeRepresentatives = users.filter(isRepresentative).length
  const upcomingEvents = events.filter((event) => new Date(event.date).getTime() >= dashboardOpenedAt).length
  const recentIssues = issues.length
  const stats = [
    { title: 'Events joined', value: registeredEventIds.size, description: 'Registered', icon: 'calendar-check' },
    { title: 'Upcoming events', value: upcomingEvents, description: 'On campus', icon: 'calendar-days' },
    { title: 'Representatives', value: activeRepresentatives, description: 'Active in your class', icon: 'user-check' },
    { title: 'Recent issues', value: recentIssues, description: 'For your class', icon: 'issues' },
  ]

  return (
    <section aria-labelledby="overview-heading">
      <h2 id="overview-heading" className="sr-only">Overview statistics</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 xl:gap-4">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="flex min-h-[104px] min-w-0 items-center gap-4 rounded-2xl border border-slate-200/75 bg-white px-4 py-3.5 shadow-[0_4px_14px_rgba(15,23,42,0.025)] sm:px-5"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <NavigationIcon name={stat.icon} className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-slate-500 sm:text-[13px]">{stat.title}</p>
              <div className="mt-1 flex items-baseline gap-2">
                <p className="text-[26px] font-bold leading-none tracking-[-0.03em] text-slate-950">{stat.value}</p>
                <p className="truncate text-[11px] font-medium text-slate-400">{stat.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default StudentStats
