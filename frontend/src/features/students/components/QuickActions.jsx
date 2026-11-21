import { NavLink } from 'react-router'
import { Card } from '../../../components/ui'
import { ROUTES } from '../../../constants/routes'
import NavigationIcon from '../../../components/navigation/NavigationIcon'

const actions = [
  { label: 'View all posts', to: ROUTES.FEED, icon: 'house' },
  { label: 'View events', to: ROUTES.EVENTS, icon: 'calendar-days' },
  { label: 'View class issues', to: ROUTES.ISSUES, icon: 'issues' },
  { label: 'View profile', to: ROUTES.PROFILE, icon: 'profile' },
]

function QuickActions() {
  return (
    <Card padding="sm" aria-labelledby="quick-actions-heading" className="border-slate-200/90 p-5 shadow-sm">
      <Card.Header className="pb-4">
        <Card.Title id="quick-actions-heading" className="text-base">Quick actions</Card.Title>
      </Card.Header>
      <nav aria-label="Quick actions" className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
        {actions.map((action) => (
          <NavLink
            key={action.to}
            to={action.to}
            className="flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2 text-center text-xs font-semibold text-slate-700 transition-colors hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            <NavigationIcon name={action.icon} className="size-4.5 text-violet-600" />
            {action.label}
          </NavLink>
        ))}
      </nav>
    </Card>
  )
}

export default QuickActions
