import { NavLink } from 'react-router'
import { Badge, Card } from '../../../components/ui'
import { issues, ISSUE_STATUS } from '../../../mocks/data/issues'
import { ROUTES } from '../../../constants/routes'
import { formatDate } from '../../../utils/formatDate'

const statusVariants = {
  [ISSUE_STATUS.PENDING]: 'warning',
  [ISSUE_STATUS.VIEWED]: 'info',
  [ISSUE_STATUS.IN_PROGRESS]: 'primary',
  [ISSUE_STATUS.RESOLVED]: 'success',
}

function RecentClassIssues() {
  return (
    <Card padding="sm" aria-labelledby="recent-issues-heading" className="rounded-2xl border-slate-200/75 p-5 shadow-[0_6px_18px_rgba(15,23,42,0.025)]">
      <Card.Header className="pb-4">
        <Card.Title id="recent-issues-heading" className="text-base">Recent class issues</Card.Title>
      </Card.Header>

      <ul className="divide-y divide-slate-100">
        {issues.slice(0, 3).map((issue) => (
          <li key={issue.id} className="py-3 first:pt-0 last:pb-0">
            <p className="text-sm font-semibold leading-5 text-slate-900">{issue.title}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <time className="text-xs text-slate-500" dateTime={issue.submittedAt}>
                {formatDate(issue.submittedAt)}
              </time>
              <Badge variant={statusVariants[issue.status]} size="xs" dot>
                {issue.status.replaceAll('_', ' ')}
              </Badge>
            </div>
          </li>
        ))}
      </ul>

      <NavLink
        to={ROUTES.ISSUES}
        className="mt-4 inline-flex min-h-9 items-center text-sm font-semibold text-violet-700 hover:text-violet-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
      >
        View all issues
      </NavLink>
    </Card>
  )
}

export default RecentClassIssues
