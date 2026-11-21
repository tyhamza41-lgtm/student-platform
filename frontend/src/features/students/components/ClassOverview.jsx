import { NavLink } from 'react-router'
import { Avatar, Badge, Card } from '../../../components/ui'
import { classes } from '../../../mocks/data/classes'
import { users } from '../../../mocks/data/users'
import { ROUTES } from '../../../constants/routes'

function ClassOverview() {
  const studentClass = classes[0]
  const representative = users.find((user) => user.id === studentClass?.representativeId)
  const activeRepresentatives = (studentClass?.activeRepresentativeIds || [])
    .map((id) => users.find((user) => user.id === id))
    .filter(Boolean)

  return (
    <Card padding="sm" aria-labelledby="class-overview-heading" className="rounded-2xl border-slate-200/75 p-5 shadow-[0_6px_18px_rgba(15,23,42,0.025)]">
      <Card.Header className="pb-4">
        <Card.Title id="class-overview-heading" className="text-base">My class</Card.Title>
      </Card.Header>

      <div>
        <p className="text-sm font-semibold text-slate-900">{studentClass?.name}</p>
        <p className="mt-1 text-xs text-slate-500">{studentClass?.institution}</p>

        {representative && (
          <div className="mt-4 flex min-w-0 items-center gap-3 rounded-xl bg-violet-50/70 p-3">
            <Avatar
              src={representative.avatarUrl}
              name={representative.name}
              alt={`${representative.name}, class representative`}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{representative.name}</p>
              <Badge variant="primary" size="xs">Primary representative</Badge>
            </div>
          </div>
        )}

        {activeRepresentatives.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium text-slate-500">Active representatives</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {activeRepresentatives.map((activeRepresentative) => (
                <Badge key={activeRepresentative.id} variant="outline" size="sm">
                  {activeRepresentative.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <NavLink
          to={ROUTES.ISSUES}
          className="mt-4 inline-flex min-h-9 items-center text-sm font-semibold text-violet-700 hover:text-violet-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          aria-label={`View issues for ${studentClass?.name || 'my class'}`}
        >
          View class information and issues
        </NavLink>
      </div>
    </Card>
  )
}

export default ClassOverview
