import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router'
import { Avatar, Badge, Card } from '../../../components/ui'
import { classes } from '../../../mocks/data/classes'
import { ROUTES } from '../../../constants/routes'
import { isRepresentative } from '../../../constants/navigation'
import * as usersService from '../../users/users.service'

function ClassOverview() {
  const studentClass = classes[0]
  const representativeIds = [
    studentClass?.representativeId,
    ...(studentClass?.activeRepresentativeIds || []),
  ].filter(Boolean)
  const representativeKey = [...new Set(representativeIds)].join('|')
  const [representativeResult, setRepresentativeResult] = useState({
    key: null,
    users: [],
    error: '',
  })

  useEffect(() => {
    let active = true
    const ids = representativeKey ? representativeKey.split('|') : []
    Promise.all(ids.map((id) => usersService.getById(id)))
      .then((records) => {
        if (active) {
          setRepresentativeResult({
            key: representativeKey,
            users: records.filter(Boolean),
            error: '',
          })
        }
      })
      .catch((error) => {
        if (active) {
          setRepresentativeResult({
            key: representativeKey,
            users: [],
            error: error.message || 'Class representatives could not be loaded.',
          })
        }
      })
    return () => { active = false }
  }, [representativeKey])

  const representatives = representativeResult.key === representativeKey
    ? representativeResult.users
    : []
  const getRepresentative = (id) => representatives.find((user) => user.id === id)
  const representative = getRepresentative(studentClass?.representativeId)
  const primaryRepresentative = representative && isRepresentative(representative)
    ? representative
    : null
  const activeRepresentatives = (studentClass?.activeRepresentativeIds || [])
    .map(getRepresentative)
    .filter(isRepresentative)

  return (
    <Card padding="sm" aria-labelledby="class-overview-heading" className="rounded-2xl border-slate-200/75 p-5 shadow-[0_6px_18px_rgba(15,23,42,0.025)]">
      <Card.Header className="pb-4">
        <Card.Title id="class-overview-heading" className="text-base">My class</Card.Title>
      </Card.Header>

      <div>
        <p className="text-sm font-semibold text-slate-900">{studentClass?.name}</p>
        <p className="mt-1 text-xs text-slate-500">{studentClass?.institution}</p>

        {representativeResult.key === representativeKey && representativeResult.error && (
          <p role="alert" className="mt-3 text-xs text-red-700">{representativeResult.error}</p>
        )}

        {primaryRepresentative && (
          <div className="mt-4 flex min-w-0 items-center gap-3 rounded-xl bg-violet-50/70 p-3">
            <Link
              to={ROUTES.USER_PROFILE(primaryRepresentative.id)}
              aria-label={`View ${primaryRepresentative.name}'s profile`}
            >
              <Avatar
                src={primaryRepresentative.avatarUrl}
                name={primaryRepresentative.name}
                alt={`${primaryRepresentative.name}, class representative`}
                size="sm"
              />
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                to={ROUTES.USER_PROFILE(primaryRepresentative.id)}
                className="block truncate text-sm font-semibold text-slate-900 hover:text-violet-700"
              >
                {primaryRepresentative.name}
              </Link>
              <Badge variant="primary" size="xs">Primary representative</Badge>
            </div>
          </div>
        )}

        {activeRepresentatives.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium text-slate-500">Active representatives</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {activeRepresentatives.map((activeRepresentative) => (
                <Link
                  key={activeRepresentative.id}
                  to={ROUTES.USER_PROFILE(activeRepresentative.id)}
                  aria-label={`View ${activeRepresentative.name}'s profile`}
                >
                  <Badge variant="outline" size="sm">{activeRepresentative.name}</Badge>
                </Link>
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
